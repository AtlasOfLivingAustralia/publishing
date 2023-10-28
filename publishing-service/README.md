# Publishing API

This is a fastapi app that provides a REST API for publishing datasets to the Atlas.

## Running the server

```bash
pip install -r requirements.txt
cd app
uvicorn main:app --reload
```

## Local dev setup

```bash

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install git+https://github.com/djtfmartin/python-dwca-reader.git
pip install git+https://github.com/djtfmartin/dwc-dataframe-validator.git
pip install -r requirements.txt
cd app
uvicorn main:app --reload
```

## Running tests

```bash
pip install -r requirements.txt
pip install pytest pytest-coverage
pip install git+https://github.com/djtfmartin/python-dwca-reader.git
pip install git+https://github.com/djtfmartin/dwc-dataframe-validator.git
pip install uvicorn
pytest --cov
```
