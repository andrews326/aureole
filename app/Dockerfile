# Backend Dockerfile

FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend source
COPY app/ .

# Expose FastAPI port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
