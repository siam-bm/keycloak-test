package com.hykmah.keycloak;

import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.Authenticator;
import org.keycloak.models.IdentityProviderModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.jboss.logging.Logger;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Domain-Based Authenticator
 * Queries HPE API to determine if user's domain requires SSO enforcement
 * and auto-redirects to appropriate IdP
 */
public class DomainBasedAuthenticator implements Authenticator {

    private static final Logger logger = Logger.getLogger(DomainBasedAuthenticator.class);
    private static final String HPE_API_URL = System.getenv().getOrDefault("HPE_API_URL", "http://localhost:3001");
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void authenticate(AuthenticationFlowContext context) {
        String loginHint = getLoginHint(context);

        if (loginHint == null || !loginHint.contains("@")) {
            logger.info("No valid login hint found, showing default login page");
            context.attempted();
            return;
        }

        String domain = extractDomain(loginHint);
        logger.info("Extracted domain: " + domain + " from email: " + loginHint);

        DomainConfig domainConfig = queryDomainConfig(domain);

        if (domainConfig != null && domainConfig.ssoEnforced && domainConfig.idpAlias != null) {
            logger.info("SSO enforced for domain: " + domain + ", redirecting to IdP: " + domainConfig.idpAlias);

            // Check if IdP exists
            IdentityProviderModel idp = context.getRealm().getIdentityProviderByAlias(domainConfig.idpAlias);

            if (idp != null && idp.isEnabled()) {
                logger.info("IdP found and enabled: " + domainConfig.idpAlias + ", performing direct redirect");

                try {
                    // Get authentication session info
                    String clientId = context.getAuthenticationSession().getClient().getClientId();
                    String tabId = context.getAuthenticationSession().getTabId();

                    // Generate session code for CSRF protection
                    String sessionCode = context.generateAccessCode();

                    // Serialize client data (redirect_uri, response_type, etc.)
                    org.keycloak.sessions.AuthenticationSessionModel authSession = context.getAuthenticationSession();
                    String clientData = authSession.getClientNote(org.keycloak.services.resources.LoginActionsService.AUTH_SESSION_ID);

                    if (clientData == null) {
                        // Build client data from auth session
                        clientData = org.keycloak.common.util.Base64Url.encode(
                            String.format("{\"ru\":\"%s\",\"rt\":\"%s\"}",
                                authSession.getRedirectUri() != null ? authSession.getRedirectUri() : "",
                                "code"
                            ).getBytes()
                        );
                    }

                    // Build broker URL with all required session parameters
                    String redirectUrl = context.getUriInfo().getBaseUriBuilder()
                        .path("realms")
                        .path(context.getRealm().getName())
                        .path("broker")
                        .path(domainConfig.idpAlias)
                        .path("login")
                        .queryParam("client_id", clientId)
                        .queryParam("tab_id", tabId)
                        .queryParam("client_data", clientData)
                        .queryParam("session_code", sessionCode)
                        .build()
                        .toString();

                    logger.info("Redirecting to: " + redirectUrl);

                    Response response = Response.status(302)
                        .location(java.net.URI.create(redirectUrl))
                        .build();

                    context.challenge(response);
                    return;
                } catch (Exception e) {
                    logger.error("Error building redirect URL", e);
                    // Fall back to showing login page
                    context.attempted();
                    return;
                }
            } else {
                logger.warn("IdP not found or disabled: " + domainConfig.idpAlias);
            }
        } else {
            logger.info("SSO not enforced or domain not found: " + (domain != null ? domain : "null") + ", showing all login options");
        }

        // Default: show all login options
        context.attempted();
    }

    @Override
    public void action(AuthenticationFlowContext context) {
        // No action needed
        context.attempted();
    }

    @Override
    public boolean requiresUser() {
        return false;
    }

    @Override
    public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
        return true;
    }

    @Override
    public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {
        // No required actions
    }

    @Override
    public void close() {
        // Nothing to close
    }

    /**
     * Extract login_hint from authentication session
     */
    private String getLoginHint(AuthenticationFlowContext context) {
        // Try to get from URL query parameters first
        MultivaluedMap<String, String> queryParams = context.getHttpRequest().getUri().getQueryParameters();
        String loginHint = queryParams.getFirst("login_hint");

        // Try form data
        if (loginHint == null) {
            MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
            loginHint = formData.getFirst("login_hint");
        }

        // Try authentication session client notes
        if (loginHint == null) {
            loginHint = context.getAuthenticationSession().getClientNote("login_hint");
        }

        // Try authentication session auth notes
        if (loginHint == null) {
            loginHint = context.getAuthenticationSession().getAuthNote("login_hint");
        }

        logger.info("Login hint extracted: " + loginHint);
        return loginHint;
    }

    /**
     * Extract domain from email
     */
    private String extractDomain(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        return email.substring(email.indexOf("@") + 1).toLowerCase().trim();
    }

    /**
     * Query HPE API for domain configuration
     */
    private DomainConfig queryDomainConfig(String domain) {
        try {
            String apiUrl = HPE_API_URL + "/api/domains/" + domain;
            logger.info("Querying domain config: " + apiUrl);

            URL url = new URL(apiUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            int responseCode = conn.getResponseCode();

            if (responseCode == 200) {
                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;

                while ((line = in.readLine()) != null) {
                    response.append(line);
                }
                in.close();

                JsonNode jsonNode = objectMapper.readTree(response.toString());

                DomainConfig config = new DomainConfig();
                config.domain = jsonNode.has("domain") ? jsonNode.get("domain").asText() : null;
                config.companyId = jsonNode.has("company_id") ? jsonNode.get("company_id").asText() : null;
                config.companyName = jsonNode.has("company_name") ? jsonNode.get("company_name").asText() : null;
                config.ssoEnforced = jsonNode.has("sso_enforced") && jsonNode.get("sso_enforced").asBoolean();
                config.idpAlias = jsonNode.has("idp_alias") ? jsonNode.get("idp_alias").asText() : null;

                logger.info("Domain config found: " + config.toString());
                return config;

            } else if (responseCode == 404) {
                logger.info("Domain not found: " + domain);
                return null;
            } else {
                logger.warn("Unexpected response code from HPE API: " + responseCode);
                return null;
            }

        } catch (Exception e) {
            logger.error("Error querying domain config for: " + domain, e);
            return null;
        }
    }

    /**
     * Domain configuration data class
     */
    private static class DomainConfig {
        String domain;
        String companyId;
        String companyName;
        boolean ssoEnforced;
        String idpAlias;

        @Override
        public String toString() {
            return "DomainConfig{" +
                   "domain='" + domain + '\'' +
                   ", companyId='" + companyId + '\'' +
                   ", ssoEnforced=" + ssoEnforced +
                   ", idpAlias='" + idpAlias + '\'' +
                   '}';
        }
    }
}
