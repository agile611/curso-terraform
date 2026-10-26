# Proyecto final: arquitectura y requisitos con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

El proyecto final reúne los conocimientos del curso en una arquitectura reproducible, verificable y fácil de recuperar.
No consiste únicamente en crear recursos.
También debes definir contratos, organizar módulos, proteger el estado, comprobar integraciones y eliminar los datos e infraestructura al finalizar.

Construirás una **plataforma local de eventos** con S3, SNS y SQS.
Un productor almacenará un documento ficticio y publicará su referencia.
Una suscripción distribuirá el evento a una cola de procesamiento.
Un consumidor de prueba recuperará el documento y comprobará su contenido.

Esta página establece la arquitectura, los requisitos y una implementación de referencia para comenzar el proyecto.

---

## 1. Objetivos del proyecto

### 1.1. Competencias

Al finalizar podrás:

- Traducir requisitos a recursos Terraform.
- Diseñar módulos con contratos claros.
- Configurar una integración entre servicios.
- Verificar configuración y comportamiento.
- Gestionar fallos y recursos pendientes.
- Documentar límites del emulador.

### 1.2. Resultado esperado

Entregarás código, pruebas, evidencias revisadas y un procedimiento de recuperación.

---

## 2. Alcance de esta lección

### 2.1. Incluye

- Arquitectura y decisiones de diseño.
- Configuración Terraform de referencia.
- Pruebas iniciales y sesiones prácticas.
- Requisitos de CI y limpieza.

### 2.2. No incluye

- Un sistema productivo completo ni una aplicación comercial.

### 2.3. Regla

Las ampliaciones deben conservar el recorrido mínimo verificable.

---

## 3. Requisitos previos

### 3.1. Herramientas

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
git --version
```

### 3.2. Conocimientos

Debes comprender módulos, estado, IAM, S3, SNS, SQS y pruebas.

---

## 4. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 4.1. Arquitectura completa

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Terraform (módulos)                                         │  │
│  │  ├── Módulo: almacenamiento (S3)                             │  │
│  │  ├── Módulo: mensajería (SNS + SQS + DLQ)                   │  │
│  │  ├── Módulo: procesamiento (Lambda + DynamoDB)              │  │
│  │  └── Raíz: orquesta módulos, configura proveedor            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                           │                                         │
│                           ▼                                         │
│              http://127.0.0.1:4566 (LocalStack)                    │
│                           │                                         │
│                           ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  S3 Bucket (documentos) → SNS Topic → SQS Queue (DLQ)     │   │
│  │       → Lambda Procesador → DynamoDB Table (metadatos)    │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2. `compose.yaml`

```yaml
services:
  localstack:
    image: localstack/localstack:3.7.0
    ports:
      - "127.0.0.1:4566:4566"
    environment:
      SERVICES: s3,sns,sqs,lambda,iam,logs,dynamodb,sts
      AWS_DEFAULT_REGION: us-east-1
      DEBUG: "1"
      LAMBDA_EXECUTOR: docker-reuse
    volumes:
      - localstack_data:/var/lib/localstack
      - /var/run/docker.sock:/var/run/docker.sock

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

## 5. Arquitectura de la plataforma de eventos

### 5.1. Flujo de datos

```
Productor (S3 PutObject)
    │
    ▼
S3 Event Notification (s3:ObjectCreated:*)
    │
    ▼
SNS Topic (fan-out)
    │
    ├──▶ SQS Queue (buffer + reintentos + DLQ)
    │       │
    │       ▼
    │   Lambda Procesador (EventSourceMapping)
    │       │
    │       ▼
    │   DynamoDB Table (metadatos + GSI)
    │
    └──▶ (futuras suscripciones: Lambda, HTTP, Email, etc.)
```

### 5.2. Componentes y responsabilidades

| Componente | Responsabilidad | Tecnología |
|------------|-----------------|------------|
| **Almacenamiento** | Guardar documento original, versionado | S3 Bucket |
| **Notificación** | Fan-out de eventos S3 | SNS Topic + S3 Notification |
| **Buffer** | Desacoplar productor/consumidor, reintentos, DLQ | SQS Queue + RedrivePolicy |
| **Procesamiento** | Leer evento, extraer metadatos, guardar en BD | Lambda (Python) + EventSourceMapping |
| **Estado** | Persistir metadatos, consultas por bucket/estado | DynamoDB (PK + GSI + TTL) |
| **Orquestación** | Declarar todo, permisos, dependencias | Terraform (módulos + raíz) |

---

## 6. Contratos de módulos (interfaces)

### 6.1. Módulo: almacenamiento (S3)

**Entradas:**
- `nombre_bucket` (string, validación S3)
- `habilitar_versionado` (bool, default true)
- `dias_expiracion_versiones` (number, default 90)

**Salidas:**
- `bucket_name`, `bucket_arn`, `bucket_domain_name`

### 6.2. Módulo: mensajería (SNS + SQS + DLQ)

**Entradas:**
- `nombre_base` (string)
- `crear_dlq` (bool, default true)
- `max_receive_count` (number, default 3)
- `visibility_timeout` (number, default 30)

**Salidas:**
- `topic_arn`, `principal_url`, `dlq_url`, `subscription_arn`

### 6.3. Módulo: procesamiento (Lambda + DynamoDB)

**Entradas:**
- `nombre_funcion` (string)
- `source_dir` (string, ruta a código Python)
- `tabla_metadatos_arn` (string, para permisos IAM)
- `cola_url` (string, para EventSourceMapping)

**Salidas:**
- `function_arn`, `function_name`, `log_group_name`

---

## 7. Requisitos funcionales

### 7.1. Recorrido mínimo verificable (MVP)

1. **Subida**: Usuario sube PDF a `s3://bucket/documentos/archivo.pdf`
2. **Notificación**: S3 emite evento → SNS Topic
3. **Entrega**: SNS → SQS Queue (raw_message_delivery=true)
4. **Procesamiento**: Lambda lee SQS → parsea evento S3 → extrae bucket/key/size
5. **Persistencia**: Lambda guarda metadatos en DynamoDB (PK: `documento_id = bucket/key`)
6. **Consulta**: GSI permite buscar por `bucket + estado`

### 7.2. Criterios de aceptación

| Criterio | Verificación |
|----------|--------------|
| Subida PDF → DynamoDB | `aws_local dynamodb query` encuentra item con PK correcto |
| GSI funcional | Query por `bucket + estado=PROCESADO` devuelve item |
| DLQ funciona | Fallo simulado 3 veces → mensaje en DLQ |
| Limpieza | `terraform destroy` → todos los `list-*` vacíos |
| Módulos | 4 módulos (raíz + 3 hijos) con interfaces claras |

---

## 8. Requisitos no funcionales

| Requisito | Especificación |
|-----------|----------------|
| **Modularidad** | 4 módulos (raíz + 3 hijos) con interfaces tipadas |
| **Least Privilege** | IAM roles con permisos mínimos + condiciones |
| **Observabilidad** | Logs Lambda, métricas SQS, TTL en DynamoDB |
| **Resiliencia** | SQS DLQ (maxReceiveCount=3), Lambda retry, TTL en DynamoDB |
| **Recuperación** | Procedimiento documentado para DLQ, drift, pérdida de estado |
| **Limpieza** | `terraform destroy` + verificación `list-*` vacíos |
| **Documentación** | README por módulo, diagrama arquitectura, decisiones |

---

## 9. Estructura del proyecto

```
proyecto-final/
├── main.tf                 # Raíz: orquesta módulos
├── providers.tf            # Proveedor AWS + LocalStack
├── variables.tf            # Variables globales (entorno, prefijo)
├── outputs.tf              # Outputs de nivel superior
├── modules/
│   ├── almacenamiento/     # S3 Bucket + notificaciones
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── mensajeria/         # SNS Topic + SQS Queue + DLQ
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── procesamiento/      # Lambda + DynamoDB
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── src/            # Código Lambda (processor.py)
│   └── comun/              # (opcional) utilidades compartidas
└── tests/                  # Pruebas de integración (opcional)
```

---

## 10. Sesiones guiadas

### 10.1. Sesión 1: Arquitectura y diseño de módulos (40 min)

1. Revisar arquitectura y contratos de módulos
2. Diseñar interfaces de cada módulo (variables + outputs)
3. Crear estructura de directorios
4. **Entrega**: Diagrama arquitectura + contratos de módulos (markdown)

### 10.2. Sesión 2: Implementación módulos base (50 min)

1. Implementar módulo `almacenamiento` (S3 + notificación S3→SNS)
2. Implementar módulo `mensajeria` (SNS + SQS + DLQ)
3. `terraform init` → `plan` → `apply` módulos base
4. **Entrega**: Módulos base desplegados + verificación `aws_local`

### 10.3. Sesión 3: Procesamiento y integración (50 min)

1. Implementar módulo `procesamiento` (Lambda + DynamoDB + EventSourceMapping)
2. Conectar módulos en raíz (pasar outputs como inputs)
3. Desplegar pipeline completo
6. **Entrega**: Pipeline completo desplegado + verificación `aws_local`

### 10.3. Sesión 4: Pruebas end-to-end y fallos (40 min)

1. Subir PDF → verificar trazabilidad completa S3→SNS→SQS→Lambda→DynamoDB
2. Verificar GSI (query por bucket+estado)
3. Simular fallo Lambda → DLQ → recuperación
4. **Entrega**: Evidencia trazabilidad completa + DLQ + recuperación

### 10.4. Sesión 5: CI/CD, limpieza y documentación (30 min)

1. Pipeline CI simulado: `fmt` → `validate` → `plan` → `apply` (manual)
2. `terraform destroy` → verificación limpieza total
3. Documentar: arquitectura, decisiones, limitaciones, procedimiento recuperación
6. **Entrega**: Documentación completa + evidencias + limpieza verificada

---

## 11. Limitaciones LocalStack en proyecto final

| Componente | LocalStack | AWS Real |
|------------|------------|----------|
| S3 Event Notifications | ✅ | ✅ |
| SNS → SQS | ✅ | ✅ |
| SQS DLQ | ✅ | ✅ |
| Lambda (Python) | ✅ | ✅ |
| Event Source Mapping | ✅ | ✅ |
| DynamoDB GSI/TTL/Stream | ✅ | ✅ |
| S3 → SNS permissions | ✅ | ✅ |
| IAM evaluation | ⚠️ Simplificado | ✅ |
| Lambda VPC/ENI | ❌ | ✅ |
| CloudWatch Metrics/Alarms | ❌ | ✅ |
| X-Ray Tracing | ❌ | ✅ |

---

## 12. Evaluación y cierre

### 12.1. Rúbrica final (0-2 puntos por criterio)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Arquitectura | No documentada | Parcial | Completa + decisiones justificadas |
| Módulos | No modular | Parcial | 4 módulos + interfaces tipadas |
| Integración | Aislada | Parcial | 5 servicios + verificación end-to-end |
| Resiliencia | No considera | Básica | DLQ + retry + TTL + GSI |
| CI/CD | No hay | Básico | Pipeline simulado + gates |
| Documentación | Ausente | Parcial | Completa + decisiones + recuperación |
| Limpieza | No limpia | Parcial | Destroy + verificación total |

### 12.2. Checklist final del proyecto

- [ ] Estructura de módulos creada (raíz + 3 hijos)
- [ ] Módulo `almacenamiento`: S3 + notificación S3→SNS + versionado
- [ ] Módulo `mensajeria`: SNS Topic + SQS Queue + DLQ + RedrivePolicy
- [ ] Módulo `procesamiento`: Lambda + DynamoDB (PK+GSI+TTL) + EventSourceMapping
- [ ] Raíz orquesta módulos pasando outputs como inputs
- [ ] Subida PDF → DynamoDB tiene metadatos (PK + GSI query)
- [ ] Fallo simulado → DLQ → recuperación documentada
- [ ] `terraform destroy` limpia todo
- [ ] Todos los `list-*` vacíos
- [ ] Documentación: arquitectura, decisiones, límites, recuperación

### 12.3. Idea principal

> **Proyecto final = síntesis del curso.**
> Módulos especializados + contratos claros + integración declarativa.
> Terraform orquesta: recursos, permisos, eventos, mappings, estado.
> **End-to-end = subir archivo → ver metadatos en BD. Si falla → DLQ → reintentar.**
> **Esta arquitectura es la base para sistemas reales: desacoplado, resiliente, observable.**
