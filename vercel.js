{
    "version": 2,
        "rewrites": [
            { "source": "/generate", "destination": "/api/index.js" },
            { "source": "/inbox", "destination": "/api/index.js" },
            { "source": "/validate", "destination": "/api/index.js" },
            { "source": "/health", "destination": "/api/index.js" },
            { "source": "/(.*)", "destination": "/tempbox.html" }
        ]
}