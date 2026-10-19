import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apps.api.core.config import settings
from apps.api.core.seed import init_db
from apps.api.routers import health, organization, workforce, projects, scrum, runs, audit, recruitment, approvals

# Ensure workspace root directory exists
os.makedirs(settings.WORKSPACE_ROOT, exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize schema & default seeds
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AgencyOS - Control plane for human-supervised AI workforce and Scrum delivery",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler for structured redacted error reporting
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": str(exc) if settings.DEBUG else "An unexpected internal error occurred.",
            "path": request.url.path
        }
    )

# Include Routers
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(organization.router, prefix=settings.API_V1_PREFIX)
app.include_router(workforce.router, prefix=settings.API_V1_PREFIX)
app.include_router(projects.router, prefix=settings.API_V1_PREFIX)
app.include_router(scrum.router, prefix=settings.API_V1_PREFIX)
app.include_router(runs.router, prefix=settings.API_V1_PREFIX)
app.include_router(audit.router, prefix=settings.API_V1_PREFIX)
app.include_router(recruitment.router, prefix=settings.API_V1_PREFIX)
app.include_router(approvals.router, prefix=settings.API_V1_PREFIX)



@app.get("/")
def root():
    return {
        "message": "Welcome to AgencyOS API",
        "docs": f"{settings.API_V1_PREFIX}/docs",
        "health": f"{settings.API_V1_PREFIX}/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apps.api.main:app", host="127.0.0.1", port=8000, reload=True)
