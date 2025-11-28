import os
from dotenv import load_dotenv
from google.cloud import secretmanager
import warnings

load_dotenv(override=True)

# Model Configuration
# Using gemini-2.5-pro which supports function calling with google-genai SDK
GEMINI_FLASH = "gemini-2.0-flash"
GEMINI_PRO = "gemini-2.5-pro"

# Session Configuration
DATABASE_PATH = "database/burpla.db"
DEFAULT_APP_NAME = "burpla"

class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Config, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "wifipass-d739e")
        self.client = None

        # Only attempt to initialize Secret Manager if we have a project ID
        # and we are likely in an environment that supports it or has credentials.
        if self.project_id:
             try:
                 self.client = secretmanager.SecretManagerServiceClient()
             except Exception:
                 # Fail silently if credentials are not available (e.g. local dev without login)
                 pass

    def get_secret(self, secret_id, default=None):
        """
        Retrieves a configuration value.
        Priority:
        1. Environment Variable
        2. Google Secret Manager
        3. Default value
        """
        # 1. Try environment variable first
        val = os.getenv(secret_id)
        if val:
            return val

        # 2. Try Secret Manager
        if self.client and self.project_id:
            try:
                name = f"projects/{self.project_id}/secrets/{secret_id}/versions/latest"
                response = self.client.access_secret_version(request={"name": name})
                return response.payload.data.decode("UTF-8")
            except Exception:
                # If secret doesn't exist or permission denied, ignore
                pass

        return default

    @property
    def google_api_key(self):
        return self.get_secret("GOOGLE_API_KEY")

    @property
    def port(self):
        return int(self.get_secret("PORT", "8000"))

config = Config()
