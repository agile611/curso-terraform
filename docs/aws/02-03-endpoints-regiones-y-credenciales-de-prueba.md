# Endpoints, regiones y credenciales de prueba en Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Esta lección profundiza en tres decisiones críticas al configurar el provider de AWS para LocalStack:
la región de referencia, los endpoints por servicio y las credenciales ficticias.
Entender su interacción evita fugas a AWS real y errores de conexión.

El laboratorio utiliza S3 como servicio principal.
La práctica incluye configuraciones correctas, incorrectas y su diagnóstico.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar región de referencia y región real de ejecución.
- Explicar por qué cada servicio necesita su endpoint.
- Distinguir credenciales de identidad y credenciales de firma.
- Reconocer el papel de `s3_use_path_style`.
- Identificar riesgos de configuración incompleta.

### 1.2. Objetivos prácticos

También podrás:

- Configurar región, endpoints y credenciales en `providers.tf`.
- Probar conectividad servicio a servicio.
- Diagnosticar errores de endpoint faltante.
- Verificar que no hay fuga a AWS real.
- Documentar la configuración elegida.

---

## 2. Alcance de la lección

### 2.1. Componentes

- Terraform CLI (>= 1.6, < 2.0).
- Provider AWS (~> 5.0).
- LocalStack (3.7.0) con S3, STS, SQS.
- `aws_local` para verificación.
- Docker Compose.

### 2.2. Exclusiones

- AWS real, IAM real, backends remotos.
- Servicios no declarados en `endpoints`.

---

## 3. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
```

Conocimientos: HCL básico, provider AWS, Docker Compose, Bash.

---

## 4. Configuración del laboratorio

### 4.1. Arquitectura

```
Terraform (provider "aws")
    │
    ├── region = "us-east-1"          ← Región de referencia
    ├── access_key = "test"           ← Credenciales ficticias
    ├── secret_key = "test"
    ├── skip_* = true                 ← Omitir validaciones AWS real
    ├── s3_use_path_style = true      ← Path style para LocalStack
    └── endpoints {                   ← Endpoints explícitos
          s3  = "http://127.0.0.1:4566"
          sts = "http://127.0.0.1:4566"
          sqs = "http://127.0.0.1:4566"
        }
    │
    ▼
http://127.0.0.1:4566 (LocalStack)
```

### 4.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sts,sqs
      AWS_DEFAULT_REGION: us-east-1
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 4.3. `aws_local`

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

---

## 5. Región: referencia vs real

### 5.1. En LocalStack

- `region` en provider = `us-east-1` (string de referencia).
- `AWS_DEFAULT_REGION` en compose = `us-east-1`.
- **No afecta** a la ubicación física (todo es local).
- **Sí afecta** a: firmas de request, nombres de recursos en algunos servicios.

### 5.2. En AWS Real

- Región = ubicación física del servicio (ej. `us-east-1`, `eu-west-1`).
- Afecta: latencia, disponibilidad, precio, leyes de datos.
- Endpoints son regionales: `s3.us-east-1.amazonaws.com`.

### 5.3. Tabla comparativa

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| `region` en provider | Referencia lógica | Ubicación física |
| Cambiar región | Solo string | Diferente endpoint, distinta infra |
| Multi-región | No soportado | Nativo |
| `AWS_DEFAULT_REGION` | Debe coincidir | Independiente por servicio |

> **Regla**: En LocalStack, la región es un string que debe coincidir entre provider y compose. No implica infraestructura distribuida.

---

## 6. Endpoints: uno por servicio

### 6.1. Por qué endpoints explícitos

El provider AWS tiene endpoints por defecto para AWS real:
- `s3.us-east-1.amazonaws.com`
- `sts.us-east-1.amazonaws.com`
- `sqs.us-east-1.amazonaws.com`

**Sin `endpoints` en la configuración, el provider usa los de AWS real.**

### 6.2. Configuración correcta

```hcl
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  s3_use_path_style = true

  endpoints {
    s3  = "http://127.0.0.1:4566"
    sts = "http://127.0.0.1:4566"
    sqs = "http://127.0.0.1:4566"
  }
}
```

### 6.3. Qué pasa si falta un endpoint

| Endpoint faltante | Síntoma | Riesgo |
|-------------------|---------|--------|
| `sts` | Warning/error al validar credenciales | Fuga a STS real |
| `sqs` | `connection refused` al crear cola | Fuga a SQS real |
| `sns` | Timeout o error DNS | Fuga a SNS real |
| `dynamodb` | Error de conexión | Fuga a DynamoDB real |

> **Regla de oro**: Declara `endpoints` para **cada servicio que uses**.

---

## 7. Credenciales ficticias: qué son y qué no son

### 7.1. En LocalStack

```hcl
access_key = "test"
secret_key = "test"
```

- Son **strings arbitrarias** que el provider requiere.
- LocalStack **no valida** su autenticidad.
- Cualquier par no vacío funciona.

### 7.2. En AWS Real

- Access Key ID = identificador público (ej. `AKIA...`).
- Secret Access Key = clave privada (nunca hardcodear).
- Se obtienen de IAM, STS, SSO, roles de instancia.

### 7.3. `skip_credentials_validation = true`

**Qué hace**: Omite la llamada a `STS:GetCallerIdentity` al inicializar.
**Por qué**: En AWS real valida que las credenciales existen y tienen permisos.
En LocalStack esa llamada fallaría o iría a AWS real.

### 7.4. Tabla comparativa

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| `access_key` | `"test"` (dummy) | `AKIA...` (real) |
| `secret_key` | `"test"` (dummy) | Secreto real (protegido) |
| Validación | `skip_credentials_validation = true` | Automática (STS) |
| Rotación | No aplica | Obligatoria (políticas) |
| Fuga riesgo | Bajo (solo local) | Crítico (cuenta real) |

---

## 8. `s3_use_path_style = true`

### 8.1. Dos estilos de direccionamiento S3

| Estilo | URL | Uso |
|--------|-----|-----|
| **Virtual-hosted** | `https://bucket.s3.region.amazonaws.com/key` | Default AWS real |
| **Path-style** | `https://s3.region.amazonaws.com/bucket/key` | LocalStack, legacy |

### 8.2. Por qué path-style en LocalStack

- LocalStack no configura DNS wildcard (`*.localhost`).
- Virtual-hosted requiere resolver `bucket.localhost` → no funciona.
- Path-style usa ruta: `http://localhost:4566/bucket/key` → funciona.

### 8.3. En AWS Real (referencia)

```hcl
# AWS real: path-style solo para casos específicos
provider "aws" {
  region = "us-east-1"
  # s3_use_path_style = false  # default
  # Endpoints omitidos
}
```

> **Nota**: AWS anunció deprecación de path-style para buckets nuevos (2020), pero LocalStack lo requiere.

---

## 9. Práctica guiada: Configuraciones y diagnóstico

### Paso 1: Preparar

```bash
mkdir -p endpoints-regiones/evidencias
cd endpoints-regiones
docker compose up -d
source .env.localstack
```

### Paso 2: Configuración CORRECTA

```hcl
# providers.tf - Correcta
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  s3_use_path_style = true
  endpoints {
    s3  = "http://127.0.0.1:4566"
    sts = "http://127.0.0.1:4566"
    sqs = "http://127.0.0.1:4566"
  }
}
```

```hcl
# main.tf
resource "aws_s3_bucket" "test" {
  bucket = "tf-endpoints-correct-001"
}
resource "aws_sqs_queue" "test" {
  name = "tf-endpoints-correct-001"
}
```

```bash
terraform init
terraform plan -out=correct.tfplan
terraform apply correct.tfplan

# Verificar
aws_local s3api head-bucket --bucket tf-endpoints-correct-001
aws_local sqs get-queue-url --queue-name tf-endpoints-correct-001
```

### Paso 3: Configuración INCORRECTA - Falta endpoint SQS

```hcl
# providers.tf - INCORRECTA (falta sqs en endpoints)
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  s3_use_path_style = true
  endpoints {
    s3  = "http://127.0.0.1:4566"
    sts = "http://127.0.0.1:4566"
    # sqs FALTA
  }
}
```

```bash
terraform plan
# Observar: ¿planifica SQS? ¿Qué endpoint usará?
terraform apply
# Error esperado: connection refused / timeout en SQS real
```

### Paso 4: Configuración INCORRECTA - Falta s3_use_path_style

```hcl
# providers.tf - INCORRECTA (falta path style)
provider "aws" {
  region = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  # s3_use_path_style = true  FALTA
  endpoints {
    s3  = "http://127.0.0.1:4566"
    sts = "http://127.0.0.1:4566"
  }
}
```

```bash
terraform plan
terraform apply
# Error: S3 intenta virtual-hosted style → DNS falla
```

### Paso 5: Verificar no fuga a AWS real

```bash
# Con configuración CORRECTA
terraform apply

# En otra terminal, monitorizar conexiones salientes
# sudo netstat -tnp | grep :443  # No debería haber conexiones a AWS
# O usar tcpdump / wireshark
```

### Paso 6: Limpiar

```bash
terraform destroy
aws_local s3api list-buckets
aws_local sqs list-queues
docker compose down
```

---

## 10. Sesiones guiadas para el alumnado

### 10.1. Sesión 1: Configuración correcta (20 min)

1. Escribir `providers.tf` completa
2. `terraform init` → `plan` → `apply` (S3 + SQS)
3. Verificar ambos con `aws_local`
4. **Entrega**: `providers.tf` + plan + verificación dual

### 10.2. Sesión 2: Diagnóstico de errores (25 min)

1. Quitar `endpoints.sqs` → `plan` → `apply` → documentar error
2. Quitar `s3_use_path_style` → `plan` → `apply` → documentar error
3. Quitar `skip_credentials_validation` → `init` → documentar warning
4. Restaurar configuración correcta
5. **Entrega**: Tabla de 4 errores + causa + solución

### 10.3. Sesión 3: Verificación de no fuga (15 min)

1. Configuración correcta aplicada
2. Verificar que no hay tráfico a `*.amazonaws.com`
3. `aws_local` confirma recursos en LocalStack
4. **Entrega**: Evidencia de aislamiento

---

## 11. Ejercicios de refuerzo

### 11.1. Ejercicio de identificación

Explica:
- Por qué `region = "us-east-1"` en LocalStack no significa "Virginia del Norte"
- Qué hace `skip_metadata_api_check = true` (evita 169.254.169.254)
- Diferencia entre `access_key` en LocalStack vs AWS real

### 11.2. Ejercicio de diagnóstico

Un alumno tiene este `providers.tf`:

```hcl
provider "aws" {
  region = "eu-west-1"
  access_key = "test"
  secret_key = "test"
  endpoints { s3 = "http://127.0.0.1:4566" }
}
```

Problemas:
1. Región distinta a compose (`us-east-1`)
2. Falta `skip_*`
3. Falta `s3_use_path_style`
4. Falta `endpoints.sts`

¿Qué síntomas aparecerán? Prioriza por gravedad.

### 11.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una checklist de validación para providers.tf en LocalStack.
Incluye: región, credenciales, skip_*, path_style, endpoints por servicio.
Para cada item: qué verificar, síntoma si falla, cómo arreglar.
```

---

## 12. Limitaciones LocalStack

| Configuración | LocalStack | AWS Real |
|---------------|------------|----------|
| Región | String de referencia | Infraestructura física |
| Endpoints | Manuales, por servicio | Automáticos, regionales |
| Credenciales | Dummy, no validadas | Reales, validadas por STS |
| Path style | Obligatorio | Deprecated (legacy) |
| Multi-región | No | Nativo |

---

## 13. Diagnóstico de errores frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| `connection refused` SQS/SNS | Endpoint faltante | Añadir a `endpoints` |
| `InvalidHost` S3 | Falta `s3_use_path_style` | Añadir `= true` |
| `RequestError: send request failed` | LocalStack no arrancado | `docker compose up -d` |
| `CredentialsEndpointError` | Falta `skip_credentials_validation` | Añadir `= true` |
| Timeout largo al `init` | Falta `skip_metadata_api_check` | Añadir `= true` |

---

## 14. Evaluación y cierre

### 14.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Región | No coincide compose | Coincide pero sin entender | Coincide + explica referencia vs real |
| Endpoints | Solo S3 | S3 + STS | Todos los servicios usados |
| Credenciales | Reales o vacías | Ficticias pero sin skip_* | Ficticias + skip_* completas |
| Path style | Falso/omitido | True sin explicar | True + explica virtual-hosted vs path |
| Diagnóstico | No identifica errores | Identifica algunos | Identifica todos + tabla causa/solución |

### 14.2. Checklist final

- [ ] `region` coincide con `AWS_DEFAULT_REGION` en compose
- [ ] Credenciales ficticias (`test`/`test`)
- [ ] Todas las `skip_*` en `true`
- [ ] `s3_use_path_style = true`
- [ ] `endpoints` declarado para CADA servicio usado
- [ ] Verificación con `aws_local` (S3 + SQS)
- [ ] Pruebas de error documentadas (endpoint faltante, path style)
- [ ] Limpieza completa

### 14.3. Idea principal

> **Región = string; Endpoints = carreteras; Credenciales = llaves.**
> Falta una carretera → el proveedor toma la autopista a AWS real.
> **Declara todo. Verifica todo. Aísla todo.**
