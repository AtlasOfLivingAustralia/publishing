# Publishing API and UI for darwin core archives

This repository contains an API and UI component for publishing darwin core archives into an Atlas.
The key components of this are:
* [publishing-ui](publishing-ui/README.md) - a react typescript application that provides a user interface for publishing archives.
* [publishing-service](publishing-service/README.md) - a python fastapi application that provides a OpenAPI compliant REST API for publishing archives.
* [dwc-dataframe-validator](https://github.com/AtlasOfLivingAustralia/dwc-dataframe-validator) - a python library for validating python dataframe containing darwin core data.

## Architecture

The publishing UI is a react single page application that is served by the publishing API. 
The API is a fastapi application that provides a REST API for publishing archives that connects to the 
Atlas API for JWT based authentication and registering new datasets.

![Untitled-2023-01-25-1517](https://github.com/AtlasOfLivingAustralia/publishing/assets/444897/5484fcd9-78ea-4caf-8cf8-48cc2a4831de)

## Deployment

The publishing API are deployed as a docker container. 
The docker container is built using the [Dockerfile](publishing-service/Dockerfile) in the root of this repository.

## Helm chart

The helm chart for the publishing API is located in the [Atlas helm-charts](https://github.com/AtlasOfLivingAustralia/helm-charts/tree/develop/publishing-service) repository.