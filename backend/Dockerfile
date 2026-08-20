# Design Ref: BE-8 (Render 배포). 멀티스테이지 빌드 — 런타임 이미지에는 JDK가 아니라 JRE만 남긴다.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# 의존성 레이어를 소스코드 레이어보다 먼저 캐시하기 위해 따로 복사한다.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew --version

COPY src src
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*-SNAPSHOT.jar app.jar

# Render는 PORT 환경변수로 리스닝 포트를 지정한다 — application.yml의 server.port가 이를 읽는다.
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
