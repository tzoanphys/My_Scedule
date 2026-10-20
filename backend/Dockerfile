FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -B package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/orbit-planner.jar /app/orbit-planner.jar
EXPOSE 8089
ENTRYPOINT ["java", "-jar", "/app/orbit-planner.jar"]
