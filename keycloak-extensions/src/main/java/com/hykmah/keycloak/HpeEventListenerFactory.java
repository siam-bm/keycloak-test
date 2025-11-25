package com.hykmah.keycloak;

import org.keycloak.Config;
import org.keycloak.events.EventListenerProvider;
import org.keycloak.events.EventListenerProviderFactory;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;

/**
 * Factory for creating HpeEventListener instances
 */
public class HpeEventListenerFactory implements EventListenerProviderFactory {

    private static final String PROVIDER_ID = "hpe-provisioning";
    private static final String DEFAULT_HPE_API_URL = "http://localhost:3001";

    private String hpeApiUrl;

    @Override
    public EventListenerProvider create(KeycloakSession session) {
        return new HpeEventListener(session, hpeApiUrl);
    }

    @Override
    public void init(Config.Scope config) {
        // Read configuration from keycloak.conf or environment
        hpeApiUrl = config.get("hpeApiUrl", DEFAULT_HPE_API_URL);
        System.out.println("🔧 [HPE Event Listener] Initialized with API URL: " + hpeApiUrl);
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
        // No post-initialization needed
    }

    @Override
    public void close() {
        // Cleanup if needed
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }
}