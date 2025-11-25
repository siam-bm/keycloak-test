package com.hykmah.keycloak;

import org.keycloak.models.ClientSessionContext;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.ProtocolMapperModel;
import org.keycloak.models.UserModel;
import org.keycloak.models.UserSessionModel;
import org.keycloak.protocol.oidc.mappers.*;
import org.keycloak.provider.ProviderConfigProperty;
import org.keycloak.representations.IDToken;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Custom Protocol Mapper for enriching tokens with HPE role data
 *
 * This SPI queries the HPE API for user roles and adds them to JWT tokens.
 *
 * Added claims:
 * - company_id
 * - company_name
 * - company_owner
 * - company_roles (array)
 * - product_roles (array)
 */
public class HpeProtocolMapper extends AbstractOIDCProtocolMapper
        implements OIDCAccessTokenMapper, OIDCIDTokenMapper, UserInfoTokenMapper {

    public static final String PROVIDER_ID = "hpe-roles-mapper";
    private static final String DEFAULT_HPE_API_URL = "http://localhost:3001";

    private static final List<ProviderConfigProperty> configProperties = new ArrayList<>();

    static {
        ProviderConfigProperty property;

        property = new ProviderConfigProperty();
        property.setName("hpeApiUrl");
        property.setLabel("HPE API URL");
        property.setHelpText("Base URL of the HPE API (e.g., http://localhost:3001)");
        property.setType(ProviderConfigProperty.STRING_TYPE);
        property.setDefaultValue(DEFAULT_HPE_API_URL);
        configProperties.add(property);
    }

    @Override
    public String getDisplayCategory() {
        return "Token mapper";
    }

    @Override
    public String getDisplayType() {
        return "HPE Roles Mapper";
    }

    @Override
    public String getHelpText() {
        return "Fetches user roles from HPE API and adds them to the token";
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        return configProperties;
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    protected void setClaim(IDToken token, ProtocolMapperModel mappingModel,
                            UserSessionModel userSession, KeycloakSession keycloakSession,
                            ClientSessionContext clientSessionCtx) {

        UserModel user = userSession.getUser();
        String userId = user.getId();

        System.out.println("🔐 [HPE Protocol Mapper] Enriching token for user: " + user.getEmail());

        try {
            String hpeApiUrl = mappingModel.getConfig().getOrDefault("hpeApiUrl", DEFAULT_HPE_API_URL);

            // Fetch roles from HPE API
            Map<String, Object> roleData = fetchUserRoles(hpeApiUrl, userId);

            if (roleData != null) {
                // Add claims to token
                token.getOtherClaims().put("company_id", roleData.get("company_id"));
                token.getOtherClaims().put("company_name", roleData.get("company_name"));
                token.getOtherClaims().put("company_owner", roleData.get("company_owner"));
                token.getOtherClaims().put("company_roles", roleData.get("company_roles"));
                token.getOtherClaims().put("product_roles", roleData.get("product_roles"));

                System.out.println("   ✅ Token enriched with company: " + roleData.get("company_name"));
            } else {
                System.out.println("   ⚠️  No role data found for user");
            }

        } catch (Exception e) {
            System.err.println("   ❌ Error enriching token: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Fetch user roles from HPE API
     */
    private Map<String, Object> fetchUserRoles(String hpeApiUrl, String userId) {
        CloseableHttpClient httpClient = null;
        CloseableHttpResponse response = null;

        try {
            httpClient = HttpClients.createDefault();
            HttpGet request = new HttpGet(hpeApiUrl + "/api/users/" + userId + "/roles");

            response = httpClient.execute(request);

            if (response.getStatusLine().getStatusCode() == 200) {
                String responseBody = EntityUtils.toString(response.getEntity());
                ObjectMapper mapper = new ObjectMapper();
                return mapper.readValue(responseBody, Map.class);
            } else {
                System.err.println("   ⚠️  HPE API returned status: " + response.getStatusLine().getStatusCode());
                return null;
            }

        } catch (Exception e) {
            System.err.println("   ❌ Error fetching roles from HPE API: " + e.getMessage());
            return null;
        } finally {
            try {
                if (response != null) response.close();
                if (httpClient != null) httpClient.close();
            } catch (Exception e) {
                // Ignore
            }
        }
    }

    public static ProtocolMapperModel create(String name, String hpeApiUrl) {
        ProtocolMapperModel mapper = new ProtocolMapperModel();
        mapper.setName(name);
        mapper.setProtocolMapper(PROVIDER_ID);
        mapper.setProtocol("openid-connect");
        mapper.getConfig().put("hpeApiUrl", hpeApiUrl);
        return mapper;
    }
}
