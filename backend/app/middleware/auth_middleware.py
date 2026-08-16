from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..supabase_client import supabase
import logging

logger = logging.getLogger("jannetra.auth")
security = HTTPBearer()

def require_role(allowed_roles: list[str]):
    """
    FastAPI dependency to enforce Role-Based Access Control using Supabase JWT.
    
    Usage:
        @app.get("/protected")
        async def protected_route(user = Depends(require_role(["district_admin"]))):
            ...
    """
    async def role_checker(auth: HTTPAuthorizationCredentials = Security(security)):
        token = auth.credentials
        try:
            # Secure validation via Supabase API
            # This ensures the token is active, valid, and hasn't been revoked
            user_resp = supabase.auth.get_user(token)
            if not user_resp or not user_resp.user:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            
            user = user_resp.user
            
            # Check custom claim injected by the Supabase Auth Hook
            app_metadata = user.app_metadata or {}
            user_role = app_metadata.get("user_role", "citizen")
            
            if user_role not in allowed_roles:
                logger.warning(f"Access denied for user {user.id}. Role '{user_role}' not in allowed roles: {allowed_roles}")
                raise HTTPException(status_code=403, detail="Insufficient permissions")
                
            return user
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise HTTPException(status_code=401, detail="Authentication failed")
            
    return role_checker

def require_auth():
    """
    FastAPI dependency to require authentication, regardless of role.
    """
    async def auth_checker(auth: HTTPAuthorizationCredentials = Security(security)):
        token = auth.credentials
        try:
            user_resp = supabase.auth.get_user(token)
            if not user_resp or not user_resp.user:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            return user_resp.user
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    return auth_checker
