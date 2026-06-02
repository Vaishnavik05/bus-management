FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY busbooking/pom.xml busbooking/pom.xml
COPY busbooking/src busbooking/src
WORKDIR /build/busbooking
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /build/busbooking/target/*.jar app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]