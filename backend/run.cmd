@echo off
set JAVA_HOME=C:\Program Files\ojdkbuild\java-17-openjdk-17.0.3.0.6-1
set PATH=%JAVA_HOME%\bin;%USERPROFILE%\.maven\apache-maven-3.9.12\bin;%PATH%
call mvn spring-boot:run
