# ============================================================
# Averroes Backend — Python FastAPI Docker Image
#
# Multi-stage build isn't needed here since Python doesn't
# compile to a binary. We keep it simple:
# 1. Base Python image
# 2. Install dependencies
# 3. Copy source code
# 4. Run uvicorn
# ============================================================

FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed by pypdf and python-docx
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for Docker layer caching)
# This means dependencies are only re-installed when requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source code
COPY . .

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose the FastAPI port
EXPOSE 8000

# Default command — overridden by docker-compose for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
