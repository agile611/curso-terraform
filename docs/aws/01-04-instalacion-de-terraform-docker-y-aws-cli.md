# Instalación de Terraform, Docker y AWS CLI para laboratorios con LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Esta lección prepara el entorno técnico que utilizarás durante el curso.
Instalarás Terraform, Docker y AWS CLI siguiendo una ruta compatible con tu sistema operativo.
Después arrancarás LocalStack y comprobarás que las herramientas pueden trabajar juntas.

La instalación no termina cuando aparece un ejecutable.
También hay que verificar versiones, permisos, arquitectura, conectividad y resultados.
Por eso la unidad incluye comprobaciones individuales y un laboratorio integrado.

La documentación distingue tres rutas: Windows con WSL, macOS y Linux (Ubuntu 24.04).
Debes seguir una sola ruta principal.
Mezclar instalaciones de distintos entornos suele producir errores difíciles de identificar.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar la función de Terraform.
- Diferenciar Docker CLI y Docker Engine.
- Explicar para qué sirve Docker Compose.
- Diferenciar AWS CLI de una cuenta de AWS.
- Identificar el papel de LocalStack.
- Reconocer la arquitectura de tu equipo.

### 1.2. Objetivos prácticos

También podrás:

- Instalar las herramientas necesarias.
- Comprobar que sus ejecutables están disponibles.
- Arrancar un contenedor local.
- Consultar una API emulada.
- Inicializar un proyecto Terraform.
- Crear y eliminar un recurso de prueba.
- Registrar las versiones utilizadas.

### 1.3. Evidencias de aprendizaje

Conserva:

- Una tabla de versiones.
- Una descripción de tu ruta de instalación.
- Los archivos del laboratorio.
- Las comprobaciones relevantes.
- Un registro de errores y soluciones.
- La evidencia de limpieza final.

---

## 2. Alcance y límites de la lección

### 2.1. Qué instalaremos

Las herramientas principales son:

- Terraform CLI.
- Docker Engine o Docker Desktop.
- Docker Compose (plugin `docker compose`).
- AWS CLI versión 2.
- Utilidades auxiliares de terminal (curl, jq, unzip).
- LocalStack mediante una imagen de contenedor.

### 2.2. Qué no configuraremos

Quedan fuera de esta lección:

- Credenciales reales de AWS.
- Identidades IAM.
- Backends remotos de Terraform.
- Automatizaciones corporativas.
- Acceso remoto al motor de Docker.
- Publicación de servicios en Internet.

### 2.3. Condición importante

Las versiones y paquetes disponibles pueden cambiar.
Los comandos describen procedimientos habituales.
El docente debe comprobar la ruta elegida antes de impartir la sesión.
Esta página no afirma haber ejecutado las instalaciones en tu equipo.

---

## 3. Requisitos previos

### 3.1. Conocimientos necesarios

Debes saber:

- Abrir una terminal.
- Crear directorios.
- Editar un archivo de texto.
- Ejecutar un comando.
- Leer un mensaje de error.
- Diferenciar una ruta de un nombre de archivo.

### 3.2. Recursos del equipo

Necesitas:

- Conexión a Internet para la preparación inicial.
- Espacio libre para herramientas e imágenes (mínimo 10 GB).
- Memoria suficiente para Docker y LocalStack (mínimo 4 GB RAM libre).
- Permisos de instalación cuando correspondan.
- Virtualización disponible si utilizas Docker Desktop.
- Un editor de texto (VS Code, vim, nano, etc.).

### 3.3. Equipos administrados

En un equipo corporativo o educativo, consulta las restricciones.
No desactives controles de seguridad para completar la práctica.
No instales software fuera del procedimiento autorizado.
Si faltan permisos, utiliza un entorno preparado por el centro.

---

## 4. Elegir una ruta de instalación

La ruta depende del sistema operativo y del lugar donde ejecutarás los comandos.

### 4.1. Opciones recomendadas

La tabla resume las alternativas utilizadas en esta documentación.

| **Sistema** | **Ruta principal** | **Terminal del curso** |
|-------------|--------------------|------------------------|
| Windows | WSL 2 (Ubuntu 24.04) + Docker Desktop | Bash dentro de WSL |
| macOS | Herramientas locales (brew) + Docker Desktop | Terminal (zsh/bash) |
| Ubuntu Linux 24.04 | Herramientas locales (apt) + Docker Engine | Bash |

La ruta principal debe mantenerse durante toda la práctica.
No ejecutes unas herramientas en Windows y otras en WSL sin documentarlo.

### 4.2. Decisión previa

Antes de instalar, decide:

1. ¿Dónde ejecutarás Terraform y AWS CLI? (Host vs WSL vs contenedor)
2. ¿Dónde se ejecutará Docker? (Docker Desktop vs Docker Engine)
3. ¿Usarás la misma terminal para todo?

**Recomendación para el curso**: Ubuntu 24.04 nativo o WSL 2 con Ubuntu 24.04, Docker Engine/Desktop, y todo en Bash.

---

## 5. Instalación en Ubuntu 24.04 (Ruta principal del curso)

Esta es la ruta de referencia para el curso. Todas las prácticas asumen este entorno.

### 5.1. Actualizar el sistema

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### 5.2. Instalar dependencias base

```bash
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  software-properties-common \
  unzip \
  jq \
  git
```

### 5.3. Instalar Docker Engine

```bash
# 1. Añadir clave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 2. Añadir repositorio oficial
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Instalar Docker Engine, CLI, Compose plugin, containerd
sudo apt-get update && sudo apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

### 5.4. Configurar Docker sin sudo

```bash
# Añadir usuario al grupo docker
sudo usermod -aG docker $USER

# Aplicar cambio en sesión actual
newgrp docker

# Verificar
docker compose version
docker run --rm hello-world
```

> **Nota**: `newgrp docker` crea una subshell. En una terminal nueva el cambio ya está activo.

### 5.5. Instalar Terraform

```bash
# 1. Añadir clave GPG de HashiCorp
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# 2. Añadir repositorio
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
sudo tee /etc/apt/sources.list.d/hashicorp.list

# 3. Instalar
sudo apt-get update && sudo apt-get install -y terraform
```

### 5.6. Instalar AWS CLI v2

```bash
# Descargar instalador
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# Descomprimir e instalar
unzip awscliv2.zip
sudo ./aws/install

# Limpiar
rm -rf awscliv2.zip aws
```

### 5.7. Configuración mínima AWS CLI (para evitar warnings)

```bash
aws configure set cli_pager ""
aws configure set region us-east-1
```

> **Importante**: Para el laboratorio con LocalStack, las credenciales reales NO se configuran aquí. Se pasan mediante la función `aws_local` que anula cualquier configuración guardada.

### 5.8. Verificación completa

```bash
# Tabla de versiones
echo "=== VERSIONES ==="
terraform version
docker version --format '{{.Server.Version}}'
docker compose version
aws --version
curl --version
jq --version
```

Salida esperada (versiones aproximadas):

```text
=== VERSIONES ===
Terraform v1.9.x on linux_amd64
Docker Engine: 27.x.x
Docker Compose: v2.x.x
aws-cli/2.x.x Python/3.x.x Linux/6.x.x exe/x86_64.ubuntu.24
curl 8.x.x
jq-1.7.x
```

---

## 6. Instalación en Windows con WSL 2 (Alternativa)

### 6.1. Instalar WSL 2 y Ubuntu 24.04

```powershell
# En PowerShell como Administrador
wsl --install -d Ubuntu-24.04
# Reiniciar si se solicita
```

### 6.2. Instalar Docker Desktop para Windows

1. Descargar desde https://www.docker.com/products/docker-desktop/
2. Instalar con opción "Use WSL 2 based engine"
3. En Settings > Resources > WSL Integration: habilitar para Ubuntu-24.04

### 6.3. Dentro de WSL (Ubuntu), seguir pasos 5.2 a 5.8

```bash
# En terminal WSL (Ubuntu)
# Los comandos son idénticos a la sección 5
```

> **Importante**: Ejecuta TODO dentro de WSL. No mezcles comandos de Windows (PowerShell) con comandos de Linux (Bash).

---

## 7. Instalación en macOS (Alternativa)

### 7.1. Usando Homebrew (recomendado)

```bash
# Instalar Homebrew si no está
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar herramientas
brew install terraform docker docker-compose awscli jq

# Docker Desktop: descargar e instalar desde https://www.docker.com/products/docker-desktop/
# Iniciar Docker Desktop y verificar
docker version
docker compose version
```

### 7.2. Verificación

```bash
terraform version
docker version
docker compose version
aws --version
```

---

## 8. Arranque de prueba de LocalStack

### 8.1. Crear directorio de prueba

```bash
mkdir -p test-localstack
cd test-localstack
```

### 8.2. Archivo `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts
      AWS_DEFAULT_REGION: us-east-1
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 8.3. Arrancar y verificar

```bash
# Validar sintaxis
docker compose config

# Arrancar
docker compose up -d

# Ver estado
docker compose ps

# Ver logs
docker compose logs --tail=50 localstack

# Health check
curl -s http://localhost:4566/_localstack/health | jq .
```

### 8.4. Definir `aws_local` y probar S3

```bash
aws_local() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
  AWS_CONFIG_FILE=/dev/null \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true \
  aws \
    --endpoint-url http://localhost:4566 \
    --region us-east-1 \
    --no-cli-pager \
    "$@"
}

# Probar S3
aws_local s3api list-buckets
# Debe devolver: {"Buckets": [], "Owner": {...}}
```

### 8.5. Prueba rápida con Terraform

```bash
# Crear main.tf mínimo
cat > main.tf <<'EOF'
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check = true
  skip_region_validation = true
  skip_requesting_account_id = true
  s3_use_path_style = true
  endpoints { s3 = "http://localhost:4566" }
}
resource "aws_s3_bucket" "test" {
  bucket = "tf-test-install-001"
}
EOF

# Ciclo completo
terraform init
terraform fmt
terraform validate
terraform plan -out=test.tfplan
terraform apply test.tfplan

# Verificar
aws_local s3api head-bucket --bucket tf-test-install-001

# Limpiar
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan
aws_local s3api list-buckets

# Detener LocalStack
docker compose down
```

---

## 9. Sesiones guiadas para el alumnado

### 9.1. Sesión 1: Instalación y verificación (45 min)

1. Seguir ruta de instalación según SO
2. Ejecutar tabla de versiones
3. Crear `compose.yaml` de prueba
4. Arrancar LocalStack y health check
5. Definir `aws_local` y probar `list-buckets`
6. **Entrega**: Tabla de versiones + evidencia health check + `list-buckets` vacío

### 9.2. Sesión 2: Prueba integrada Terraform + LocalStack (30 min)

1. Escribir `main.tf` mínimo (bucket S3)
2. Ejecutar ciclo completo: `init` → `fmt` → `validate` → `plan` → `apply`
3. Verificar con `aws_local`
4. Limpiar: `plan -destroy` → `apply` → `list-buckets`
5. Detener LocalStack
6. **Entrega**: Logs de cada comando + verificación final limpia

---

## 10. Ejercicios de refuerzo

### 10.1. Ejercicio de identificación

Explica la función de:
- `docker compose` vs `docker` CLI
- `aws configure` vs función `aws_local`
- `.terraform.lock.hcl` vs `versions.tf`

### 10.2. Ejercicio de diagnóstico

Simula un error: detén LocalStack (`docker compose down`) y ejecuta `terraform plan`.
Observa el error. Vuelve a arrancar LocalStack y repite.
Documenta la diferencia.

### 10.3. Ejercicio con asistente de IA

```text
Instrucción:
Explica a un estudiante por qué es importante verificar versiones ANTES de empezar.
Incluye: Terraform CLI, Provider AWS, Docker, LocalStack, AWS CLI.
No inventes versiones. Usa las de tu entorno real.
```

---

## 11. Limitaciones conocidas en la instalación

| Componente | Limitación LocalStack | AWS Real |
|------------|----------------------|----------|
| Docker | Requiere socket montado para Lambda | No aplica (servicio gestionado) |
| Terraform | Provider AWS ~> 5.0 probado | Cualquier versión compatible |
| AWS CLI | v2 requerida para `aws_local` | v1 o v2 |
| Ubuntu 24.04 | Ruta principal probada | Cualquier SO soportado |

---

## 12. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `docker: permission denied` | Grupo docker, `newgrp docker` | Usar `sudo docker` siempre |
| `terraform: command not found` | PATH, instalación apt/brew | Descargar binario manual sin paquete |
| `aws: command not found` | Instalación AWS CLI v2, PATH | Usar `awscliv1` (deprecated) |
| LocalStack health check falla | Puerto 4566, logs contenedor | Cambiar puerto sin revisar conflictos |
| `terraform init` falla descarga | Red, proxy, mirror registry | Borrar `.terraform` sin diagnosticar |

---

## 13. Evaluación y cierre

### 13.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Instalación | Herramientas faltantes | Una herramienta falla | Todas funcionan |
| Verificación | Sin tabla versiones | Tabla incompleta | Tabla completa + health check |
| Prueba integrada | No crea bucket | Crea pero no verifica | Ciclo completo + limpieza |
| Documentación | No registra versiones | Registra parcial | Registra todo + errores |

### 13.2. Checklist final

- [ ] Terraform CLI instalado y verificado (>= 1.6, < 2.0)
- [ ] Docker Engine/Desktop + Compose funcionando
- [ ] AWS CLI v2 instalado
- [ ] LocalStack arranca y health check OK
- [ ] `aws_local` definida y `list-buckets` funciona
- [ ] Ciclo Terraform completo probado (init→apply→destroy)
- [ ] Versiones documentadas en tabla
- [ ] LocalStack detenido al finalizar

### 13.3. Idea principal

> **El entorno es la base de todo el curso.**
> Versiones documentadas + health checks + prueba integrada = confianza para avanzar.
> **Si la instalación falla, nada de lo posterior funcionará de forma fiable.**
