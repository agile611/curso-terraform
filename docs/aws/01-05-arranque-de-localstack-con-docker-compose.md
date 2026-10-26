# Arranque de LocalStack con Docker Compose para un curso de Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Esta lección prepara un servicio de LocalStack que puedas arrancar, comprobar y detener de forma controlada.
Docker Compose describirá el entorno.
AWS CLI (vía `aws_local`) permitirá verificar la API emulada.
Terraform completará una prueba de integración con un recurso S3.

El objetivo no es conseguir únicamente que un contenedor aparezca como iniciado.
El objetivo es comprender qué se ejecuta, dónde escucha y qué evidencias demuestran su disponibilidad.
También aprenderás a distinguir una parada, una recreación y una limpieza de recursos.

Los comandos del laboratorio se ejecutan en Bash.
Terraform y AWS CLI se ejecutan en el equipo anfitrión (Ubuntu 24.04).
LocalStack se ejecuta dentro de Docker.
Esta arquitectura debe mantenerse durante la práctica principal.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar la función de Docker Compose.
- Diferenciar una imagen de un contenedor.
- Interpretar un mapeo de puertos.
- Distinguir disponibilidad del contenedor y disponibilidad de una API.
- Explicar el significado de `localhost` / `127.0.0.1`.
- Reconocer los límites de la emulación.

### 1.2. Objetivos prácticos

También podrás:

- Crear un archivo `compose.yaml`.
- Seleccionar una imagen concreta (etiqueta o digest).
- Arrancar LocalStack.
- Consultar registros.
- Verificar S3 mediante `aws_local`.
- Conectar Terraform.
- Limpiar y detener el laboratorio.

---

## 2. Alcance de la práctica

### 2.1. Componentes utilizados

Utilizaremos:

- Docker Engine o Docker Desktop.
- Docker Compose (plugin `docker compose`).
- Una imagen de LocalStack (ej. 3.7.0).
- AWS CLI versión 2.
- Terraform CLI (>= 1.6, < 2.0).
- El provider de AWS (~> 5.0).
- Bash y un editor de texto.

### 2.2. Servicios emulados

S3 será el servicio funcional de la práctica.
STS se incluirá entre los servicios y endpoints contemplados.
No se utilizarán recursos EC2, Lambda, RDS ni redes VPC.
Añadir esos servicios exige revisar compatibilidad y configuración.

### 2.3. Exclusiones

No se configurarán credenciales reales, políticas IAM ni backends remotos.
No se publicará el servicio en Internet.
No se montará el socket de Docker (excepto para Lambda en lecciones posteriores).
No se afirmará equivalencia completa con AWS.

---

## 3. Requisitos previos

### 3.1. Comprobaciones iniciales

Ejecuta:

```bash
docker version
docker compose version
aws --version
terraform version
```

### 3.2. Qué debes observar

Docker debe mostrar información del cliente y del servidor.
Compose debe responder como plugin mediante `docker compose`.
AWS CLI debe corresponder a la versión 2.
Terraform debe ser compatible con la configuración utilizada.

### 3.3. Condiciones del equipo

Necesitas conexión para descargar imágenes y providers cuando no estén disponibles.
Debes disponer de memoria y espacio suficientes.
En equipos administrados, utiliza el procedimiento autorizado.
No desactives controles de seguridad para resolver una instalación.

---

## 4. Política de versiones y compatibilidad

### 4.1. Información que debes registrar

Anota:

- Versión de Docker.
- Versión de Compose.
- Versión de AWS CLI.
- Versión de Terraform.
- Referencia de la imagen de LocalStack (etiqueta + digest).
- Versión seleccionada del provider de AWS (desde `.terraform.lock.hcl`).

### 4.2. Selección docente

El docente debe proporcionar una referencia de LocalStack probada.
Esa referencia debe incluir una etiqueta concreta o un digest.
La combinación debe comprobarse con los ejercicios de esta página.
Esta documentación no afirma haber ejecutado esa validación.

### 4.3. Actualizaciones

No cambies de imagen a mitad de una comparación.
Una actualización puede modificar respuestas, registros y compatibilidad.
Si actualizas, registra el motivo.
Después repite las comprobaciones funcionales.

---

## 5. Arquitectura del laboratorio

La arquitectura determina cómo deben interpretarse las direcciones de conexión.

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Terraform  │  │   AWS CLI    │  │   aws_local()    │  │
│  │   (gestión)  │  │  (verificación)│  │  (wrapper CLI)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                     │           │
│         └─────────────────┼─────────────────────┘           │
│                           ▼                                 │
│              http://127.0.0.1:4566                          │
│                           │                                 │
│                           ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐               │  │
│  │  │   S3    │  │   STS   │  │  ...    │               │  │
│  │  └─────────┘  └─────────┘  └─────────┘               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Puntos clave:**

- `127.0.0.1:4566` en el host → `4566` en el contenedor.
- `localhost` dentro del contenedor NO es el host.
- Si Terraform corriera en otro contenedor, usaría `http://localstack:4566`.

---

## 6. Archivo `compose.yaml` estándar

### 6.1. Versión mínima (S3 + STS)

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 6.2. Versión completa (para módulos posteriores)

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts,sqs,sns,dynamodb,lambda,apigateway,iam,cloudformation,logs
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
      LAMBDA_EXECUTOR: docker-reuse
    volumes:
      - localstack_data:/var/lib/localstack
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  localstack_data:
```

> **Nota**: El montaje de `/var/run/docker.sock` es necesario para Lambda. No lo incluyas si no vas a usar Lambda.

### 6.3. Decisiones de configuración

| Opción | Valor | Justificación |
|--------|-------|---------------|
| `127.0.0.1:4566` | Solo loopback | Seguridad: no expone en red local |
| `SERVICES` | Lista explícita | Solo carga lo necesario |
| `DEBUG: "1"` | Habilitado | Logs detallados para diagnóstico |
| Volumen `localstack_data` | Nombrado | Persistencia opcional entre reinicios |
| `LAMBDA_EXECUTOR: docker-reuse` | Para Lambda | Reutiliza contenedores, más rápido |

---

## 7. Comandos de ciclo de vida

### 7.1. Validar sintaxis

```bash
docker compose config
```

### 7.2. Arrancar en segundo plano

```bash
docker compose up -d
```

### 7.3. Ver estado

```bash
docker compose ps
```

Salida esperada:

```text
NAME                IMAGE                         STATUS          PORTS
localstack          localstack/localstack:3.7.0   Up X seconds    127.0.0.1:4566->4566/tcp
```

### 7.4. Consultar registros

```bash
# Últimas 100 líneas
docker compose logs --tail=100 localstack

# Seguir en tiempo real
docker compose logs -f localstack
```

### 7.5. Health check de la API

```bash
# Endpoint general
curl -s http://127.0.0.1:4566/_localstack/health | jq .

# Endpoint específico S3
curl -s http://127.0.0.1:4566/_localstack/health/s3 | jq .
```

Respuesta típica:

```json
{
  "services": {
    "s3": "running",
    "sts": "running"
  }
}
```

> **Importante**: Contenedor "Up" ≠ API lista. Siempre verifica health check.

### 7.6. Detener (mantiene volúmenes)

```bash
docker compose down
```

### 7.7. Detener y eliminar volúmenes (limpieza total)

```bash
docker compose down -v
```

> **Regla**: Destruye recursos Terraform ANTES de `docker compose down`.
> Detener el contenedor no elimina el estado de Terraform.

---

## 8. Verificación con `aws_local`

### 8.1. Definir función

```bash
aws_local() {
  AWS_ACCESS_KEY_ID=test \
  AWS_SECRET_ACCESS_KEY=test \
  AWS_SESSION_TOKEN= \
  AWS_CONFIG_FILE=/dev/null \
  AWS_SHARED_CREDENTIALS_FILE=/dev/null \
  AWS_EC2_METADATA_DISABLED=true \
  aws \
    --endpoint-url http://127.0.0.1:4566 \
    --region us-east-1 \
    --no-cli-pager \
    "$@"
}
```

### 8.2. Probar S3

```bash
# Listar buckets (debe estar vacío)
aws_local s3api list-buckets

# Crear bucket de prueba
aws_local s3api create-bucket --bucket test-compose-001

# Verificar
aws_local s3api head-bucket --bucket test-compose-001

# Limpiar prueba
aws_local s3api delete-bucket --bucket test-compose-001
```

---

## 9. Prueba de integración con Terraform

### 9.1. Configuración mínima

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

# providers.tf
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check = true
  skip_region_validation = true
  skip_requesting_account_id = true
  s3_use_path_style = true
  endpoints { s3 = "http://127.0.0.1:4566" }
}

# main.tf
resource "aws_s3_bucket" "compose_test" {
  bucket = "tf-compose-test-001"
  tags = { Leccion = "ComposeLocalStack" }
}

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.compose_test.bucket }
```

### 9.2. Ciclo completo

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=compose.tfplan
terraform show compose.tfplan
terraform apply compose.tfplan

# Verificar con aws_local
aws_local s3api list-buckets
aws_local s3api get-bucket-tagging --bucket tf-compose-test-001

# Limpiar
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan
aws_local s3api list-buckets
```

---

## 10. Sesiones guiadas para el alumnado

### 10.1. Sesión 1: Compose y arranque (20 min)

1. Crear `compose.yaml` (versión mínima)
2. `docker compose config` → validar
3. `docker compose up -d` → arrancar
4. `docker compose ps` → verificar estado
5. `docker compose logs --tail=50` → revisar logs
6. Health check `curl .../health` → confirmar APIs
7. **Entrega**: `compose.yaml` + salida `ps` + health check JSON

### 10.2. Sesión 2: Verificación con aws_local (15 min)

1. Definir `aws_local`
2. `aws_local s3api list-buckets` → vacío
3. Crear bucket prueba → `create-bucket`
4. Verificar → `head-bucket`, `list-buckets`
5. Limpiar → `delete-bucket`
6. **Entrega**: Evidencias de cada comando

### 10.3. Sesión 3: Integración Terraform (30 min)

1. Escribir archivos Terraform (versions, providers, main, outputs)
2. Ciclo completo: `init` → `fmt` → `validate` → `plan` → `apply`
3. Verificar con `aws_local` (independiente)
4. Limpiar: `plan -destroy` → `apply` → `list-buckets`
5. `docker compose down`
6. **Entrega**: Plan, apply, verificación, limpieza

---

## 11. Ejercicios de refuerzo

### 11.1. Ejercicio de identificación

Explica la función de:
- `ports: ["127.0.0.1:4566:4566"]` vs `ports: ["4566:4566"]`
- `volumes: ["localstack_data:/var/lib/localstack"]`
- `SERVICES: s3,sts` vs `SERVICES: all`

### 11.2. Ejercicio de diagnóstico

1. Arranca LocalStack.
2. Detén el contenedor (`docker compose down`).
3. Vuelve a arrancar (`docker compose up -d`).
4. Ejecuta `terraform plan` en el directorio de la prueba anterior.
5. ¿Qué observa Terraform? ¿Por qué?
6. **Entrega**: Explicación de la discrepancia estado vs realidad.

### 11.3. Ejercicio con asistente de IA

```text
Instrucción:
Explica por qué health check es necesario aunque docker compose ps diga "Up".
Distingue: contenedor corriendo vs API lista.
No inventes salidas. Usa la respuesta real de tu health check.
```

---

## 12. Limitaciones de LocalStack en esta lección

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| Arranque | Segundos (contenedor) | N/A (servicio gestionado) |
| Persistencia | Volumen Docker (opcional) | Gestionada por AWS |
| Multi-AZ | No | Sí |
| Escalado automático | No | Sí |
| Health checks | `/_localstack/health` | CloudWatch, ALB health checks |

---

## 13. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| Puerto 4566 ocupado | `lsof -i :4566`, otro LocalStack | Cambiar puerto sin saber por qué |
| Health check falla | Logs contenedor, SERVICES list | Asumir que "Up" = listo |
| Terraform connection refused | Endpoint en provider, compose up | Cambiar a AWS real |
| Volumen no persiste | `docker compose down -v` usado | Esperar persistencia sin volumen |
| Lambda falla | `/var/run/docker.sock` montado | Usar Lambda sin socket Docker |

---

## 14. Evaluación y cierre

### 14.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Compose | Sintaxis inválida | Funciona pero incompleto | Completo + health check |
| Arranque | No inicia | Inicia pero sin verificación | Inicia + health check + logs |
| Verificación | Sin aws_local | aws_local definida pero no usada | aws_local + pruebas S3 |
| Integración | No conecta Terraform | Conecta pero no verifica | Ciclo completo + verificación |
| Limpieza | No limpia | Limpia parcial | Limpia + down + verificación |

### 14.2. Checklist final

- [ ] `compose.yaml` válido y con etiqueta concreta
- [ ] LocalStack arranca y `ps` muestra "Up"
- [ ] Health check devuelve S3/STS "running"
- [ ] `aws_local` definida y funcional
- [ ] Terraform conecta y crea bucket
- [ ] Verificación independiente con `aws_local`
- [ ] Limpieza: destroy → list-buckets vacío → `docker compose down`

### 14.3. Idea principal

> **Contenedor "Up" ≠ API lista.**
> Health check + verificación funcional (`aws_local`) = confianza real.
> **Arranca, verifica, usa, limpia, detiene. En ese orden.**
