# DynamoDB: tablas y claves con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Amazon DynamoDB es una base de datos NoSQL de clave-valor y documento.
Ofrece rendimiento de milisegundos de un dígito a cualquier escala.
Terraform permite declarar tablas, claves primarias, índices secundarios (GSI/LSI), TTL y streams.
LocalStack permite practicar estas operaciones mediante una emulación local de las API de AWS.

En esta lección crearás tablas con clave primaria simple y compuesta.
Configurarás índices secundarios globales (GSI) y locales (LSI).
Practicarás operaciones CRUD, TTL y consultas.

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear una tabla DynamoDB con clave primaria simple (PK) y compuesta (PK+SK).
- Definir atributos y sus tipos (S, N, B).
- Crear índices secundarios globales (GSI) y locales (LSI).
- Configurar TTL (Time To Live) para expiración automática.
- Habilitar Streams para captura de cambios.
- Realizar operaciones: PutItem, GetItem, Query, Scan, UpdateItem, DeleteItem.
- Entender unidades de capacidad (RCU/WCU) y modo On-Demand.

### 1.2. Resultado práctico

Construirás dos tablas: una con PK simple, otra con PK+SK + GSI + TTL + Stream.

---

## 2. Requisitos previos

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
python3 --version
```

El laboratorio utiliza Terraform 1.6 o superior dentro de la serie 1.x.
El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer recursos, variables, outputs, referencias y planes guardados.
Los comandos utilizan una terminal compatible con Bash.
Terraform y AWS CLI se ejecutan en el host.

---

## 3. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 3.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────────┐                    │
│  │   Terraform  │  │   aws_local()    │                    │
│  │   (gestión)  │  │  (CRUD/Query)    │                    │
│  └──────┬───────┘  └────────┬─────────┘                    │
│         │                   │                              │
│         └───────────────────┼──────────────────────────────┘
│                             ▼                              │
│              http://127.0.0.1:4566                          │
│                             │                              │
│                             ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │  Tabla PK simple + Tabla PK+SK + GSI + TTL     │   │  │
│  │  └────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: dynamodb,sts
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
    volumes:
      - localstack_data:/var/lib/localstack

volumes:
  localstack_data:
```

### 3.3. `aws_local`

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

### 3.4. Configuración Terraform base

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
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  endpoints { dynamodb = "http://127.0.0.1:4566", sts = "http://127.0.0.1:4566" }
}
```

---

## 4. Conceptos clave de DynamoDB

### 4.1. Tipos de datos

| Tipo | Código | Ejemplo |
|------|--------|---------|
| String | `S` | `"texto"` |
| Number | `N` | `"123"` (string JSON) |
| Binary | `B` | base64 |
| Boolean | `BOOL` | `true` |
| Null | `NULL` | `true` |
| List | `L` | `["a", "b"]` |
| Map | `M` | `{"k": "v"}` |
| Set (String/Number/Binary) | `SS/NS/BS` | `["a", "b"]` |

### 4.2. Clave primaria

| Tipo | Estructura | Uso |
|------|------------|-----|
| **Simple (PK)** | Solo `HashKey` (Partition Key) | Acceso directo por ID único |
| **Compuesta (PK+SK)** | `HashKey` + `RangeKey` (Sort Key) | Consultas por rango, jerarquías |

### 4.3. Índices secundarios

| Índice | Clave | Caso de uso |
|--------|-------|-------------|
| **GSI (Global)** | PK propia (distinta a tabla) | Consultas alternativas, distinto partition key |
| **LSI (Local)** | Mismo PK, distinto SK | Consultas alternativas con mismo partition key |

### 4.4. Modos de capacidad

| Modo | Descripción |
|------|-------------|
| **Provisioned** | RCU/WCU fijos, auto-scaling opcional |
| **On-Demand** | Pago por uso, sin gestión de capacidad |

---

## 5. Práctica guiada paso a paso

### Paso 1: Preparar

```bash
mkdir -p dynamodb-tablas/evidencias
cd dynamodb-tablas
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Configuración Terraform - Tabla 1 (PK simple)

```hcl
# versions.tf, providers.tf (sección 3.4)

# variables.tf
variable "project" { type = string, default = "ddb-demo" }

# locals.tf
locals {
  prefix = var.project
  tags = { Leccion = "DynamoDB" }
}

# main.tf
# Tabla 1: PK simple (solo Partition Key)
resource "aws_dynamodb_table" "usuarios" {
  name           = "${local.prefix}-usuarios"
  billing_mode   = "PAY_PER_REQUEST"  # On-Demand
  hash_key       = "user_id"
  attribute {
    name = "user_id"
    type = "S"
  }
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
  tags = local.tags
}

# Tabla 2: PK compuesta (PK + SK) + GSI + TTL + Stream
resource "aws_dynamodb_table" "pedidos" {
  name           = "${local.prefix}-pedidos"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "order_id"
  attribute {
    name = "user_id"
    type = "S"
  }
  attribute {
    name = "order_id"
    type = "S"
  }
  attribute {
    name = "estado"
    type = "S"
  }
  attribute {
    name = "fecha"
    type = "S"
  }

  # GSI: consultar por estado + fecha
  global_secondary_index {
    name               = "estado-fecha-index"
    hash_key           = "estado"
    range_key          = "fecha"
    projection_type    = "ALL"
  }

  # GSI: consultar por user_id + estado (distinto PK)
  global_secondary_index {
    name               = "user-estado-index"
    hash_key           = "user_id"
    range_key          = "estado"
    projection_type    = "KEYS_ONLY"
  }

  # TTL
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Stream
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = local.tags
}

# outputs.tf
output "usuarios_table" { value = aws_dynamodb_table.usuarios.name }
output "pedidos_table"  { value = aws_dynamodb_table.pedidos.name }
output "pedidos_gsi_arns" { value = aws_dynamodb_table.pedidos.global_secondary_index }
output "pedidos_stream_arn" { value = aws_dynamodb_table.pedidos.stream_arn }
```

### Paso 3: Desplegar

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=ddb.tfplan
terraform show ddb.tfplan
# Verificar: 2 tablas, 2 GSI, TTL, Stream

terraform apply ddb.tfplan
```

### Paso 4: Verificar tablas

```bash
aws_local dynamodb list-tables
aws_local dynamodb describe-table --table-name ddb-demo-usuarios
aws_local dynamodb describe-table --table-name ddb-demo-pedidos
```

### Paso 5: Operaciones CRUD - Tabla usuarios (PK simple)

```bash
# PutItem
aws_local dynamodb put-item \
  --table-name ddb-demo-usuarios \
  --item '{"user_id":{"S":"user-001"},"nombre":{"S":"Ana"},"email":{"S":"ana@ejemplo.com"},"activo":{"BOOL":true},"expires_at":{"N":"'$(date -d "+1 year" +%s)'"}}'

# GetItem
aws_local dynamodb get-item --table-name ddb-demo-usuarios --key '{"user_id":{"S":"user-001"}}'

# UpdateItem
aws_local dynamodb update-item \
  --table-name ddb-demo-usuarios \
  --key '{"user_id":{"S":"user-001"}}' \
  --update-expression "SET #n = :n, #e = :e" \
  --expression-attribute-names '{"#n":"nombre","#e":"email"}' \
  --expression-attribute-values '{"n":{"S":"Ana García"},"e":{"S":"ana.garcia@ejemplo.com"}}' \
  --return-values ALL_NEW

# DeleteItem
aws_local dynamodb delete-item --table-name ddb-demo-usuarios --key '{"user_id":{"S":"user-001"}}'
```

### Paso 6: Operaciones - Tabla pedidos (PK+SK + GSI)

```bash
# PutItem (varios pedidos)
aws_local dynamodb put-item --table-name ddb-demo-pedidos --item '{"user_id":{"S":"user-001"},"order_id":{"S":"ord-001"},"estado":{"S":"pendiente"},"fecha":{"S":"2024-01-15"},"total":{"N":"99.99"},"expires_at":{"N":"'$(date -d "+30 days" +%s)'"}}'
aws_local dynamodb put-item --table-name ddb-demo-pedidos --item '{"user_id":{"S":"user-001"},"order_id":{"S":"ord-002"},"estado":{"S":"enviado"},"fecha":{"S":"2024-01-16"},"total":{"N":"149.50"},"expires_at":{"N":"'$(date -d "+30 days" +%s)'"}}'
aws_local dynamodb put-item --table-name ddb-demo-pedidos --item '{"user_id":{"S":"user-002"},"order_id":{"S":"ord-003"},"estado":{"S":"entregado"},"fecha":{"S":"2024-01-17"},"total":{"N":"75.00"},"expires_at":{"N":"'$(date -d "+30 days" +%s)'"}}'

# GetItem (PK+SK)
aws_local dynamodb get-item --table-name ddb-demo-pedidos --key '{"user_id":{"S":"user-001"},"order_id":{"S":"ord-001"}}'

# Query por PK (user_id) - todos los pedidos de un usuario
aws_local dynamodb query \
  --table-name ddb-demo-pedidos \
  --key-condition-expression "user_id = :uid" \
  --expression-attribute-values '{":uid":{"S":"user-001"}}'

# Query por GSI (estado + fecha) - pedidos pendientes ordenados por fecha
aws_local dynamodb query \
  --table-name ddb-demo-pedidos \
  --index-name estado-fecha-index \
  --key-condition-expression "estado = :est AND fecha >= :fec" \
  --expression-attribute-values '{":est":{"S":"pendiente"},":fec":{"S":"2024-01-01"}}' \
  --scan-index-forward true

# Query por GSI (user_id + estado) - pedidos pendientes de un usuario
aws_local dynamodb query \
  --table-name ddb-demo-pedidos \
  --index-name user-estado-index \
  --key-condition-expression "user_id = :uid AND estado = :est" \
  --expression-attribute-values '{":uid":{"S":"user-001"},":est":{"S":"pendiente"}}'

# Scan (con filtro) - todos los pedidos con total > 100
aws_local dynamodb scan \
  --table-name ddb-demo-pedidos \
  --filter-expression "total > :t" \
  --expression-attribute-values '{":t":{"N":"100"}}'

# UpdateItem (cambiar estado)
aws_local dynamodb update-item \
  --table-name ddb-demo-pedidos \
  --key '{"user_id":{"S":"user-001"},"order_id":{"S":"ord-001"}}' \
  --update-expression "SET #e = :e" \
  --expression-attribute-names '{"#e":"estado"}' \
  --expression-attribute-values '{":e":{"S":"enviado"}}' \
  --return-values ALL_NEW

# DeleteItem
aws_local dynamodb delete-item --table-name ddb-demo-pedidos --key '{"user_id":{"S":"user-002"},"order_id":{"S":"ord-003"}}'
```

### Paso 7: TTL y Streams

```bash
# Verificar TTL habilitado
aws_local dynamodb describe-table --table-name ddb-demo-usuarios | jq '.Table.TimeToLiveDescription'
aws_local dynamodb describe-table --table-name ddb-demo-pedidos | jq '.Table.TimeToLiveDescription'

# Verificar Stream
aws_local dynamodb describe-table --table-name ddb-demo-pedidos | jq '.Table.StreamSpecification'

# Leer stream (shard iterator)
STREAM_ARN=$(terraform output -raw pedidos_stream_arn)
SHARD_IT=$(aws_local dynamodb get-shard-iterator --stream-arn "$STREAM_ARN" --shard-id shardId-000000000000 --shard-iterator-type TRIM_HORIZON | jq -r '.ShardIterator')
aws_local dynamodb get-records --shard-iterator "$SHARD_IT" | jq '.Records[] | {eventName, dynamodb: {Keys, NewImage, OldImage}}'
```

### Paso 8: Limpiar

```bash
terraform destroy -auto-approve
aws_local dynamodb list-tables
docker compose down
```

---

## 6. Sesiones guiadas

### 6.1. Sesión 1: Tablas básicas (25 min)

1. Crear tabla PK simple + tabla PK+SK
2. `plan` → verificar atributos, GSI, TTL, Stream
3. `apply` → verificar con `describe-table`
4. **Entrega**: Esquema tablas + verificación atributos/GSI/TTL/Stream

### 6.2. Sesión 2: CRUD y Query (30 min)

1. PutItem, GetItem, UpdateItem, DeleteItem en ambas tablas
2. Query por PK, Query por GSI, Scan con filtro
3. **Entrega**: Evidencias de cada operación + resultados

### 6.3. Sesión 3: TTL, Stream y limpieza (25 min)

1. Verificar TTL funcionando (insertar con expires_at pasado)
2. Verificar Stream (leer registros tras modificaciones)
3. `terraform destroy` → limpiar
4. **Entrega**: Evidencia TTL + Stream + limpieza

---

## 7. Ejercicios de refuerzo

### 7.1. Ejercicio de identificación

Explica la diferencia entre:
- `hash_key` vs `range_key`
- `global_secondary_index` vs `local_secondary_index`
- `projection_type`: `ALL` vs `KEYS_ONLY` vs `INCLUDE`
- `billing_mode`: `PROVISIONED` vs `PAY_PER_REQUEST`
- `stream_view_type`: `KEYS_ONLY` vs `NEW_IMAGE` vs `OLD_IMAGE` vs `NEW_AND_OLD_IMAGES`

### 7.2. Ejercicio de interpretación

Una tabla tiene PK=`user_id`, SK=`timestamp`.
GSI: `hash_key=status`, `range_key=timestamp`, `projection_type=ALL`.
¿Qué query permite este GSI que no permite la tabla base?
¿Qué coste adicional tiene el GSI?

### 7.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una tabla DynamoDB para "inventario" con:
- PK: "producto_id" (S)
- SK: "almacen_id" (S)
- Atributos: "cantidad" (N), "ubicacion" (S), "categoria" (S)
- GSI 1: por "categoria" + "producto_id" (projection ALL)
- GSI 2: por "almacen_id" + "cantidad" (projection KEYS_ONLY)
- TTL en atributo "expira_en"
- Stream NEW_AND_OLD_IMAGES
- On-Demand billing
Incluye: variables, outputs para ARNs de GSI y Stream.
```

---

## 8. Limitaciones LocalStack en DynamoDB

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Tablas PK simple | ✅ | ✅ |
| Tablas PK+SK | ✅ | ✅ |
| GSI | ✅ | ✅ |
| LSI | ⚠️ Parcial | ✅ |
| TTL | ✅ | ✅ |
| Streams | ✅ Básico | ✅ |
| On-Demand billing | ✅ | ✅ |
| Provisioned + Autoscaling | ⚠️ Parcial | ✅ |
| Transacciones | ⚠️ Parcial | ✅ |
| PartiQL / SQL | ❌ | ✅ |
| Global Tables | ❌ | ✅ |
| Point-in-time Recovery | ❌ | ✅ |

---

## 9. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `ValidationException` en PutItem | Tipos de atributo (S vs N) | `"123"` para Number, no `123` |
| `ResourceNotFoundException` | Nombre tabla incorrecto | Usar output `table_name` |
| `ValidationException` en Query | KeyConditionExpression sintaxis | Nombres de atributos reservados → `#attr` |
| GSI no aparece en describe-table | `projection_type` requerido | Siempre incluir `projection_type` |
| TTL no expira | `expires_at` tipo Number (epoch seconds) | Usar `date +%s` para epoch |

---

## 10. Evaluación y cierre

### 10.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Tablas | No crea | 1 tabla simple | 2 tablas: PK simple + PK+SK+GSI+TTL+Stream |
| Atributos/GSI | No define | Básicos | PK, SK, atributos, 2 GSI, TTL, Stream |
| CRUD | No hace | Put/Get básicos | Put/Get/Update/Delete + Query GSI + Scan |
| TTL/Stream | No verifica | Verifica uno | Verifica TTL + Stream (leer registros) |
| Limpieza | No limpia | Parcial | Destroy + list-tables vacío |

### 10.2. Checklist final

- [ ] Tabla `usuarios` con PK simple + TTL
- [ ] Tabla `pedidos` con PK+SK + 2 GSI + TTL + Stream
- [ ] PutItem, GetItem, UpdateItem, DeleteItem en ambas
- [ ] Query por PK, Query por GSI (estado+fecha, user+estado)
- [ ] Scan con filtro
- [ ] TTL verificado (describe-table)
- [ ] Stream verificado (leer registros)
- [ ] `terraform destroy` limpia todo
- [ ] `aws_local dynamodb list-tables` vacío

### 10.3. Idea principal

> **DynamoDB = clave-valor a escala. Diseña por patrones de acceso.**
> PK simple = acceso directo. PK+SK = jerarquías y rangos.
> GSI = patrones de acceso alternativos. LSI = mismo PK, distinto orden.
> TTL = limpieza automática. Stream = reactividad a cambios.
> **On-Demand = sin gestión de capacidad. Provisioned = control de costes.**
