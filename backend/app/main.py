from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .auth import auth_routes
from .routes import calculator, analytics

# Create all database tables (For production, use Alembic. For this portfolio project, this is ok)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Advanced Calculator System")

# Configure CORS
origins = [
    "*", # Allowed for ease of local testing as frontend might be opened via file:// or random port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
app.include_router(calculator.router, prefix="/api", tags=["Calculator"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Advanced Calculator API"}
