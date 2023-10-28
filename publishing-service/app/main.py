from fastapi import FastAPI
from routers import publish, validate, status, events, licences, process
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    docs_url="/",
    title='Publishing API for Darwin core archives',
    description='API for publishing darwin core archives to the Atlas',
    version="0.1.0",
    securityDefinitions={
        "JWT": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "Enter the token with the 'Bearer: ' prefix, e.g. 'Bearer abcde12345'",
        }
    }
)

app.include_router(validate.router)
app.include_router(publish.router)
app.include_router(process.router)
app.include_router(status.router)
app.include_router(events.router)
app.include_router(licences.router)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You might want to re  strict this to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PUT, etc.)
    allow_headers=["*"],  # Allow all headers
)
