package com.hykmah.keycloak;

import org.keycloak.events.Event;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventType;
import org.keycloak.events.admin.AdminEvent;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.apache.http.client.methods.*;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.util.Map;

/**
 * Custom Event Listener for Just-In-Time (JIT) User Provisioning
 *
 * This SPI intercepts authentication events and provisions users in the HPE database.
 *
 * Triggers on:
 * - REGISTER: Local user registration
 * - LOGIN: First login via Identity Provider (social/enterprise SSO)
 */
public class HpeEventListener implements EventListenerProvider {

    private final KeycloakSession session;
    private final String hpeApiUrl;
    private final ObjectMapper mapper;
    private final CloseableHttpClient httpClient;

    public HpeEventListener(KeycloakSession session, String hpeApiUrl) {
        this.session = session;
        this.hpeApiUrl = hpeApiUrl;
        this.mapper = new ObjectMapper();
        this.httpClient = HttpClients.createDefault();
    }

    @Override
    public void onEvent(Event event) {
        System.out.println("🔔 [HPE Event Listener] Event: " + event.getType());

        // Handle user registration (local password)
        if (EventType.REGISTER.equals(event.getType())) {
            System.out.println("   → User registration detected");
            handleUserRegistration(event);
        }

        // Handle first login via Identity Provider
        if (EventType.LOGIN.equals(event.getType())) {
            String identityProvider = event.getDetails().get("identity_provider");
            if (identityProvider != null && !identityProvider.isEmpty()) {
                System.out.println("   → First IdP login detected: " + identityProvider);
                handleIdPFirstLogin(event);
            }
        }

        // Handle identity provider first login
        if (EventType.IDENTITY_PROVIDER_FIRST_LOGIN.equals(event.getType())) {
            System.out.println("   → Identity Provider first login");
            handleIdPFirstLogin(event);
        }
    }

    @Override
    public void onEvent(AdminEvent event, boolean includeRepresentation) {
        // Not needed for user provisioning
    }

    @Override
    public void close() {
        try {
            if (httpClient != null) {
                httpClient.close();
            }
        } catch (IOException e) {
            System.err.println("Error closing HTTP client: " + e.getMessage());
        }
    }

    /**
     * Handle local user registration
     */
    private void handleUserRegistration(Event event) {
        try {
            RealmModel realm = session.realms().getRealm(event.getRealmId());
            UserModel user = session.users().getUserById(realm, event.getUserId());

            if (user == null) {
                System.err.println("   ❌ User not found: " + event.getUserId());
                return;
            }

            String email = user.getEmail();
            System.out.println("   📧 Processing registration for: " + email);

            // Check if user already exists in HPE
            if (checkUserExists(email)) {
                System.out.println("   ⚠️  User already exists in HPE: " + email);
                return;
            }

            // Extract domain from email
            String domain = extractDomain(email);
            String companyId = lookupCompanyByDomain(domain);

            // Create user in HPE
            createUserInHPE(user, "local", null, companyId);

            // If no company found, create personal company
            if (companyId == null) {
                companyId = createPersonalCompany(user);
            }

            // Assign default role
            assignCompanyRole(user.getId(), companyId, "User");

            System.out.println("   ✅ User provisioned successfully: " + email);

        } catch (Exception e) {
            System.err.println("   ❌ Error provisioning user: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Handle first login via Identity Provider (JIT provisioning)
     */
    private void handleIdPFirstLogin(Event event) {
        try {
            RealmModel realm = session.realms().getRealm(event.getRealmId());
            UserModel user = session.users().getUserById(realm, event.getUserId());

            if (user == null) {
                System.err.println("   ❌ User not found: " + event.getUserId());
                return;
            }

            String email = user.getEmail();
            String identityProvider = event.getDetails().get("identity_provider_alias");
            String idpSub = user.getFirstAttribute("FEDERATED_IDENTITY_ID");

            System.out.println("   📧 Processing IdP login for: " + email + " via " + identityProvider);

            // Check if user already exists in HPE
            if (checkUserExists(email)) {
                System.out.println("   ⚠️  User already exists in HPE: " + email);
                // Update last login
                updateUserLastLogin(email);
                return;
            }

            // Extract domain from email
            String domain = extractDomain(email);
            String companyId = lookupCompanyByDomain(domain);

            // Create user in HPE
            createUserInHPE(user, identityProvider, idpSub, companyId);

            // If no company found, create personal company
            if (companyId == null) {
                companyId = createPersonalCompany(user);
            }

            // Assign default role
            assignCompanyRole(user.getId(), companyId, "User");

            System.out.println("   ✅ User provisioned successfully: " + email);

        } catch (Exception e) {
            System.err.println("   ❌ Error provisioning IdP user: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Check if user exists in HPE database
     */
    private boolean checkUserExists(String email) {
        try {
            HttpGet request = new HttpGet(hpeApiUrl + "/api/users?email=" + email);
            CloseableHttpResponse response = httpClient.execute(request);

            int statusCode = response.getStatusLine().getStatusCode();
            response.close();

            return statusCode == 200;
        } catch (Exception e) {
            System.err.println("   ⚠️  Error checking user existence: " + e.getMessage());
            return false;
        }
    }

    /**
     * Create user in HPE database
     */
    private void createUserInHPE(UserModel user, String idp, String idpSub, String companyId) {
        try {
            HttpPost request = new HttpPost(hpeApiUrl + "/api/users");
            request.setHeader("Content-Type", "application/json");

            ObjectNode body = mapper.createObjectNode();
            body.put("email", user.getEmail());
            body.put("name", user.getFirstName() + " " + user.getLastName());
            body.put("idp", idp);
            body.put("idp_sub", idpSub);
            body.put("email_verified", user.isEmailVerified());
            body.put("company_id", companyId);
            body.put("status", "ACTIVE");

            request.setEntity(new StringEntity(mapper.writeValueAsString(body)));

            CloseableHttpResponse response = httpClient.execute(request);
            int statusCode = response.getStatusLine().getStatusCode();

            if (statusCode == 201 || statusCode == 200) {
                System.out.println("   ✅ User created in HPE: " + user.getEmail());
            } else {
                System.err.println("   ❌ Failed to create user in HPE. Status: " + statusCode);
                System.err.println("   Response: " + EntityUtils.toString(response.getEntity()));
            }

            response.close();
        } catch (Exception e) {
            System.err.println("   ❌ Error creating user in HPE: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Update user's last login timestamp
     */
    private void updateUserLastLogin(String email) {
        try {
            // First get user ID
            HttpGet getRequest = new HttpGet(hpeApiUrl + "/api/users?email=" + email);
            CloseableHttpResponse getResponse = httpClient.execute(getRequest);

            if (getResponse.getStatusLine().getStatusCode() == 200) {
                String responseBody = EntityUtils.toString(getResponse.getEntity());
                Map<String, Object> userData = mapper.readValue(responseBody, Map.class);
                String userId = (String) userData.get("id");

                // Update last login
                HttpPatch patchRequest = new HttpPatch(hpeApiUrl + "/api/users/" + userId);
                patchRequest.setHeader("Content-Type", "application/json");

                ObjectNode body = mapper.createObjectNode();
                body.put("last_login_at", java.time.Instant.now().toString());

                patchRequest.setEntity(new StringEntity(mapper.writeValueAsString(body)));

                CloseableHttpResponse patchResponse = httpClient.execute(patchRequest);
                patchResponse.close();
            }

            getResponse.close();
        } catch (Exception e) {
            System.err.println("   ⚠️  Error updating last login: " + e.getMessage());
        }
    }

    /**
     * Lookup company by domain
     */
    private String lookupCompanyByDomain(String domain) {
        try {
            HttpGet request = new HttpGet(hpeApiUrl + "/api/domains/" + domain);
            CloseableHttpResponse response = httpClient.execute(request);

            if (response.getStatusLine().getStatusCode() == 200) {
                String responseBody = EntityUtils.toString(response.getEntity());
                Map<String, Object> domainConfig = mapper.readValue(responseBody, Map.class);
                response.close();
                return (String) domainConfig.get("company_id");
            }

            response.close();
            return null;
        } catch (Exception e) {
            System.err.println("   ⚠️  Error looking up company: " + e.getMessage());
            return null;
        }
    }

    /**
     * Create personal company for user
     */
    private String createPersonalCompany(UserModel user) {
        try {
            HttpPost request = new HttpPost(hpeApiUrl + "/api/companies");
            request.setHeader("Content-Type", "application/json");

            ObjectNode body = mapper.createObjectNode();
            body.put("name", user.getFirstName() + " " + user.getLastName() + "'s Company");
            body.put("owner_id", user.getId());
            body.put("billing_status", "trial");
            body.put("billing_plan", "free");

            request.setEntity(new StringEntity(mapper.writeValueAsString(body)));

            CloseableHttpResponse response = httpClient.execute(request);
            String responseBody = EntityUtils.toString(response.getEntity());
            Map<String, Object> companyData = mapper.readValue(responseBody, Map.class);
            response.close();

            return (String) companyData.get("id");
        } catch (Exception e) {
            System.err.println("   ⚠️  Error creating personal company: " + e.getMessage());
            return null;
        }
    }

    /**
     * Assign company role to user
     */
    private void assignCompanyRole(String userId, String companyId, String role) {
        try {
            HttpPost request = new HttpPost(hpeApiUrl + "/api/company-roles");
            request.setHeader("Content-Type", "application/json");

            ObjectNode body = mapper.createObjectNode();
            body.put("user_id", userId);
            body.put("company_id", companyId);
            body.put("product_id", 1); // Default product
            body.put("role", role);

            request.setEntity(new StringEntity(mapper.writeValueAsString(body)));

            CloseableHttpResponse response = httpClient.execute(request);
            response.close();

            System.out.println("   ✅ Role assigned: " + role);
        } catch (Exception e) {
            System.err.println("   ⚠️  Error assigning role: " + e.getMessage());
        }
    }

    /**
     * Extract domain from email
     */
    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        return email.substring(email.indexOf("@") + 1);
    }
}