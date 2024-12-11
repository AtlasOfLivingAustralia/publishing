# Publishing API

This is a fastapi app that provides a REST API for publishing datasets to the Atlas.

## Running the server

```bash
pip install -r requirements.txt
cd app
uvicorn main:app --reload
```

## Local development setup

```bash

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install git+https://github.com/djtfmartin/python-dwca-reader.git
pip install git+https://github.com/AtlasOfLivingAustralia/dwc-dataframe-validator.git
pip install -r requirements.txt
cd app
uvicorn main:app --reload
```

## Running tests

```bash
pip install -r requirements.txt
pip install pytest pytest-coverage
pip install git+https://github.com/djtfmartin/python-dwca-reader.git
pip install git+https://github.com/AtlasOfLivingAustralia/dwc-dataframe-validator.git
pip install uvicorn
pytest --cov
```

## Build and Test docker image locally
Access to localhost:8000 after running the following:
```bash
docker build -t publishing-service .
docker compose up
```

# Build and push docker image for deployment
```bash
docker buildx build --platform=linux/amd64 -t atlasoflivingaustralia/publishing-service .
docker push atlasoflivingaustralia/publishing-service:<tag-number>
```
## REST

The Swagger UI for REST services are available at `http://localhost:5000`.

## Docker hub

The docker images for publishing-service are available on [docker hub](https://hub.docker.com/r/atlasoflivingaustralia/publishing-service). 
Commits to this `develop` branch will result in a new image being built and pushed to the `latest` tag on docker hub.

## Helm charts

The helm charts for publishing-service are available in the 
[helm-charts](https://github.com/AtlasOfLivingAustralia/helm-charts) repository.

