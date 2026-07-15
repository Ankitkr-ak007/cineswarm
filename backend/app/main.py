from fastapi import FastAPI

app = FastAPI(title="CineSwarm API")

@app.get("/")
def read_root():
    return {"message": "Welcome to CineSwarm API"}
