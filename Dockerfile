# Use an official Maven image as a parent image
FROM maven:3.8.4-openjdk-17-slim AS build

# Set the working directory in the container
WORKDIR /app

# Copy the project files to the container
COPY pom.xml .
COPY src src

# Build the application
RUN mvn package -DskipTests

# Use Ubuntu as the base image for the final stage
FROM ubuntu:20.04

# Install OpenJDK and curl
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk curl && \
    rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl https://ollama.ai/install.sh | sh

# Set the working directory in the container
WORKDIR /app

# Copy the built jar file from the build stage
COPY --from=build /app/target/expense-scanner-0.0.1-SNAPSHOT.jar app.jar

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Run the jar file
CMD ["java", "-jar", "app.jar"]