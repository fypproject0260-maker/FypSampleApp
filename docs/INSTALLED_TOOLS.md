# Installed Tools and File Locations

## 1. Summary of What Changed Since the Previous Snapshot

- **CHANGED**: docker containers

## 2. Tool Details

| Tool             | Version                          | Binary Location                     | Config/Install Directories                          | Service (State, Unit File)                                                                 |
|------------------|----------------------------------|------------------------------------|----------------------------------------------------|---------------------------------------------------------------------------------------------|
| gitlab-runner    | 19.5.3                           | /usr/bin/gitlab-runner             | /etc/gitlab-runner, /home/gitlab-runner            | gitlab-runner (active), /etc/systemd/system/gitlab-runner.service                         |
| sonarqube        | N/A                              | N/A                                | /home/fypdbwe/sonarqube                            | N/A                                                                                       |
| docker           | Docker version 29.1.3            | /usr/bin/docker                    | /var/lib/docker, /etc/docker                       | docker (active), /usr/lib/systemd/system/docker.service                                   |
| git              | git version 2.53.0               | /usr/bin/git                       | N/A                                                | N/A                                                                                       |
| ollama           | ollama version is 0.40.16        | /usr/local/bin/ollama              | /usr/local/bin/ollama, /usr/share/ollama           | ollama (active), /etc/systemd/system/ollama.service                                       |

## 3. Docker Containers

| Name             | Image                   | Status                          | Ports                                                                 | Mounted Host Paths                                                                                      |
|------------------|-------------------------|---------------------------------|----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| sonarqube        | sonarqube:community     | Up 20 minutes                   | 0.0.0.0:9000->9000/tcp, [::]:9000->9000/tcp                         | /var/lib/docker/volumes/sonarqube_sonarqube_data/_data -> /opt/sonarqube/data; ...                    |
| sonarqube_db     | postgres:16             | Up 20 minutes (healthy)        | 5432/tcp                                                            | /var/lib/docker/volumes/sonarqube_postgresql_data/_data -> /var/lib/postgresql/data;                  |
| fypsampleapp     | fypsampleapp            | Up 20 minutes (healthy)        | 0.0.0.0:6767->6767/tcp, [::]:6767->6767/tcp                         |                                                                                                      |

## 4. Tools Checked but Not Found

- gitleaks
- java
- semgrep
- sonar-scanner
- trivy