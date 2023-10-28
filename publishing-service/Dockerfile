# Use an official Python runtime as a parent image
FROM python:3.8-slim

# Install Git
RUN apt-get update && \
    apt-get install -y git

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install the required packages
RUN pip install --upgrade pip
RUN pip install git+https://github.com/djtfmartin/python-dwca-reader.git
RUN pip install git+https://github.com/djtfmartin/dwc-dataframe-validator.git
RUN pip install -r requirements.txt
RUN pip install uvicorn

# Expose the port your app runs on
EXPOSE 5000

ENV TIMEOUT_KEEP_ALIVE=120
ENV HOST=0.0.0.0
ENV PORT=5000

WORKDIR /app/app

# Run the application
ENTRYPOINT uvicorn main:app --reload --host $HOST --port $PORT --timeout-keep-alive $TIMEOUT_KEEP_ALIVE