# Del emulador a AWS real: diferencias, criterios de promoción y checklist

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

LocalStack permite aprender Terraform, desarrollar integraciones y ejecutar pruebas sin utilizar una cuenta AWS real.
Ese entorno resulta especialmente útil para comprobar contratos, organizar módulos y detectar errores antes de modificar infraestructura externa.

Sin embargo, una prueba correcta en el emulador no demuestra por sí sola que la misma configuración sea segura, compatible o suficiente para producción.

La transición necesita revisar identidad, permisos, redes, estado, dependencias, cuotas, costes y procedimientos operativos.

En esta lección prepararás esa revisión sin desplegar recursos en AWS real.
Las prácticas seguirán utilizando exclusivamente LocalStack.

El resultado será un expediente de preparación: configuración portable, evidencias locales, diferencias documentadas y una decisión de promoción justificable.

---

## 1. Objetivos de aprendizaje

### 1.1. Competencias

Al finalizar podrás:

- Distinguir emulación de equivalencia.
- Separar configuración local y configuración de destino.
- Identificar dependencias exclusivas de LocalStack.
- Revisar permisos, estado, redes y costes.
- Diseñar pruebas complementarias.
- Preparar un checklist de promoción.
- Documentar bloqueos y excepciones.
- Limpiar el laboratorio de forma verificable.

### 1.2. Resultado práctico

Entregarás un expediente de preparación sin ejecutar despliegues en AWS real.

---

## 2. Alcance de la lección

### 2.1. Incluye

- Análisis de diferencias.
- Refactorización de un proveedor local.
- Pruebas con LocalStack.
- Revisión de configuración de destino.
- Checklist de seguridad y operación.

### 2.2. Fuera de alcance

- No se crearán cuentas, roles ni recursos en AWS real.

### 2.3. Regla

**Preparar una configuración no autoriza a ejecutarla fuera del laboratorio.**

---

## 3. Requisitos previos

### 3.1. Herramientas

```bash
terraform version
docker version
docker compose version
aws --version
python3 --version
jq --version
git --version
```

### 3.2. Conocimientos recomendados

Revisa estado, módulos, IAM, procesamiento asíncrono, CI y limpieza.

---

## 4. Configuración del laboratorio

### 4.1. Arquitectura

```
Terraform (configuración portable)     aws_local (verificación local)
     │                                      │
     ▼                                      ▼
http://127.0.0.1:4566 (LocalStack)          │
     │                                      │
     ▼                                      ▼
Configuración AWS Real (solo revisión)      │
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

## 5. Qué demuestra LocalStack (y qué no)

### 5.1. Propiedades comprobables localmente

| Propiedad | LocalStack | AWS Real |
|-----------|------------|----------|
| Sintaxis Terraform válida | ✅ | ✅ |
| Proveedor AWS descargado | ✅ | ✅ |
| Recursos creados en orden correcto | ✅ | ✅ |
| Dependencias implícitas/explícitas | ✅ | ✅ |
| Módulos, variables, outputs | ✅ | ✅ |
| Ciclo plan/apply/destroy | ✅ | ✅ |
| Estado local gestionado | ✅ | ✅ (con backend remoto) |
| Integración S3→SNS→SQS→Lambda | ✅ | ✅ |
| DLQ, reintentos, visibilidad | ✅ | ✅ |
| GSI, TTL, Streams en DynamoDB | ✅ | ✅ |
| Políticas IAM (sintaxis) | ✅ | ✅ |

### 5.2. Lo que NO garantiza LocalStack

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| **Evaluación IAM real** | ⚠️ Simplificada | ✅ Estricta (conditions, boundaries, SCPs) |
| **Límites de servicio (cuotas)** | ❌ Sin límites | ✅ Cuotas por cuenta/región |
| **Rendimiento y latencia** | ⚠️ Local (sub-ms) | ✅ Red, particiones, throttling |
| **Durabilidad y SLA** | ❌ Volumen Docker | ✅ 99.999999999% (S3), SLAs |
| **Multi-AZ / HA** | ❌ Single node | ✅ Multi-AZ nativo |
| **Cifrado gestionado (KMS)** | ⚠️ Simulado | ✅ KMS real, HSM, rotación |
| **Facturación y costes** | ❌ Gratis (hardware local) | ✅ Pay-per-use, budgets, alerts |
| **Políticas de servicio (SCPs)** | ❌ | ✅ Organizations + SCPs |
| **Cifrado en tránsito/reposo** | ⚠️ Parcial | ✅ TLS 1.2+, KMS, S3 SSE |
| **Auditoría (CloudTrail)** | ❌ | ✅ Completa |
| **Recuperación ante desastres** | ❌ | ✅ Cross-region, backup, PITR |

### 5.3. Regla de oro

> **Una prueba en LocalStack valida sintaxis, orden y contratos. NO valida seguridad, cuotas, costes, ni comportamiento productivo.**

---

## 6. Diferencias críticas por servicio

### 6.1. S3

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| Nombres de bucket | Locales (no globales) | Globales únicos |
| Versionado | ✅ Básico | ✅ Completo + MFA Delete |
| Replicación Cross-Region | ❌ | ✅ |
| Object Lock / Legal Hold | ❌ | ✅ |
| Access Points | ❌ | ✅ |
| CORS completo | ⚠️ Parcial | ✅ |
| Event Notifications | ✅ | ✅ (con filtros avanzados) |
| Requester Pays | ❌ | ✅ |

### 6.2. SNS + SQS

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| FIFO Topics/Queues | ❌ | ✅ |
| Message Deduplication | ❌ | ✅ |
| Filter Policy avanzado | ⚠️ Parcial | ✅ |
| Dead Letter Queues | ✅ | ✅ |
| Server-Side Encryption | ❌ | ✅ (KMS) |
| Message Retention (14 días max) | ✅ | ✅ |

### 6.3. Lambda

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| Runtimes | ✅ Python, Node, Java | ✅ + Go, .NET, Custom |
| VPC / ENI | ❌ | ✅ |
| Provisioned Concurrency | ❌ | ✅ |
| SnapStart (Java) | ❌ | ✅ |
| Function URLs | ⚠️ Parcial | ✅ |
| Layers | ⚠️ Parcial | ✅ |
| Snapshots / Versiones | ✅ | ✅ |

### 6.4. DynamoDB

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| Transacciones | ⚠️ Parcial | ✅ |
| Global Tables | ❌ | ✅ |
| Point-in-Time Recovery | ❌ | ✅ |
| PartiQL / SQL | ❌ | ✅ |
| TTL | ✅ | ✅ |
| Streams | ✅ Básico | ✅ Completo |

### 6.5. IAM

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| Evaluación de políticas | ⚠️ Simplificada | ✅ Estricta |
| Conditions complejas | ⚠️ Parcial | ✅ |
| Permissions Boundaries | ❌ | ✅ |
| SCPs (Organizations) | ❌ | ✅ |
| Access Analyzer | ❌ | ✅ |
| IAM Access Advisor | ❌ | ✅ |
| Roles Anywhere / Identity Center | ❌ | ✅ |

---

## 7. Refactorización: De proveedor local a proveedor real

### 7.1. Proveedor LocalStack (actual)

```hcl
provider "aws" {
  region     = "us-east-1"
  access_key = "test"
  secret_key = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_requesting_account_id  = true
  s3_use_path_style = true
  endpoints {
    s3      = "http://127.0.0.1:4566"
    sns     = "http://127.0.0.1:4566"
    sqs     = "http://127.0.0.1:4566"
    lambda  = "http://127.0.0.1:4566"
    dynamodb = "http://127.0.0.1:4566"
    iam     = "http://127.0.0.1:4566"
    logs    = "http://127.0.0.1:4566"
    sts     = "http://127.0.0.1:4566"
  }
}
```

### 7.2. Proveedor AWS Real (producción)

```hcl
provider "aws" {
  region = "eu-west-1"  # Región real de producción
  
  # Credenciales via:
  # - ~/.aws/credentials (profile)
  # - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (env vars)
  # - IAM Role (EC2, ECS, EKS, CodeBuild)
  # - AWS SSO (aws configure sso)
  
  # NO skip_* validations
  # NO endpoints locales
  # NO s3_use_path_style (salvo casos legacy)
  
  default_tags {
    tags = {
      Project     = "mi-proyecto"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}
```

### 7.3. Cambios necesarios en la configuración

| Cambio | LocalStack | AWS Real |
|--------|------------|----------|
| Credenciales | `test`/`test` | Perfil, env vars, IAM Role, SSO |
| Región | `us-east-1` (fija) | Región real (ej. `eu-west-1`) |
| Endpoints | Locales (`127.0.0.1:4566`) | **Eliminar** (usa endpoints AWS) |
| `skip_*` | `true` | **Eliminar** |
| `s3_use_path_style` | `true` | `false` (default) |
| Nombres de bucket | Locales | **Globales únicos** |
| IAM | Simplificado | Estricto + Conditions + Boundaries |
| Cuotas | Ignoradas | Verificar y solicitar aumentos |

---

## 8. Checklist de promoción a AWS Real

### 8.1. Identidad y acceso

- [ ] Cuenta AWS dedicada (no personal, no compartida)
- [ ] IAM Users/Roles con least privilege
- [ ] MFA obligatorio para usuarios humanos
- [ ] Roles de servicio (Lambda, EC2, ECS) con least privilege
- [ ] No credenciales hardcodeadas (usar roles, SSO, env vars)
- [ ] Access Analyzer habilitado
- [ ] Permissions Boundaries en roles críticos

### 8.2. Red y aislamiento

- [ ] VPC dedicada (no default VPC)
- [ ] Subnets privadas para Lambda, BD, caches
- [ ] NAT Gateway / VPC Endpoints para acceso a servicios AWS
- [ ] Security Groups restrictivos (puertos mínimos, CIDR específicos)
- [ ] No acceso directo a Internet desde recursos privados

### 8.3. Estado y backend

- [ ] Backend remoto: S3 + DynamoDB locking
- [ ] Versionado en bucket de estado
- [ ] Encriptación en reposo (SSE-S3 o SSE-KMS)
- [ ] Bloqueo de estado (DynamoDB) funcionando
- [ ] Acceso al estado restringido (IAM policies)

### 8.4. Seguridad y cifrado

- [ ] KMS CMK para cifrado en reposo (S3, DynamoDB, EBS, RDS)
- [ ] Rotación automática de claves KMS
- [ ] TLS 1.2+ en tránsito (ALB, API Gateway, CloudFront)
- [ ] Secrets en Secrets Manager / Parameter Store (SecureString)
- [ ] No secretos en código, estado, variables de entorno

### 8.5. Cuotas y límites

- [ ] Verificar cuotas de servicio (Service Quotas) para: Lambda, DynamoDB, S3, SQS, SNS, IAM
- [ ] Solicitar aumentos con antelación (algunos tardan días)
- [ ] Monitoreo de uso vs cuota (CloudWatch + alarmas)

### 8.6. Costes y facturación

- [ ] Budget alerts configurados (mensual, por servicio, por tag)
- [ ] Cost Allocation Tags activados y obligatorios
- [ ] Estimación de costes mensuales (AWS Pricing Calculator)
- [ ] Análisis de costes: On-Demand vs Reserved vs Savings Plans

### 8.7. Observabilidad y operación

- [ ] CloudWatch Logs: retention, métricas, alarmas
- [ ] CloudWatch Metrics: dashboards por servicio
- [ ] X-Ray tracing habilitado (Lambda, API Gateway)
- [ ] CloudTrail: multi-region, data events (S3, Lambda)
- [ ] Runbooks: escalado, rollback, recuperación, contactos

### 8.8. Resiliencia y recuperación

- [ ] Multi-AZ para servicios que lo soporten
- [ ] Backup automático (DynamoDB PITR, RDS, EBS snapshots)
- [ ] Cross-region replication para datos críticos (S3 CRR, DynamoDB Global Tables)
- [ ] RTO/RPO definidos y probados
- [ ] Chaos engineering / Game days planificados

### 8.9. CI/CD y gobernanza

- [ ] Pipeline: `fmt` → `validate` → `plan` → `apply` (con aprobación manual)
- [ ] Policy as Code: OPA/Regula/Sentinel para validar planes
- [ ] Drift detection programado (diario/semanal)
- [ ] Renovación de credenciales rotativas
- [ ] Dependency scanning (tfsec, checkov, trivy)

---

## 9. Pruebas complementarias necesarias

### 9.1. Pruebas que SÍ hacer en LocalStack

- [ ] Sintaxis y validación Terraform
- [ ] Orden de dependencias y grafo
- [ ] Módulos, variables, outputs, locals
- [ ] Ciclo completo: plan → apply → destroy
- [ ] Integración S3→SNS→SQS→Lambda→DynamoDB
- [ ] DLQ, reintentos, TTL, GSI
- [ ] Drift detection, import, moved blocks

### 9.2. Pruebas que REQUIEREN AWS Real

- [ ] Evaluación IAM real (simulate-principal-policy en AWS)
- [ ] Cuotas de servicio (Service Quotas console)
- [ ] Rendimiento bajo carga (load testing)
- [ ] Failover Multi-AZ (terminar AZ, verificar recuperación)
- [ ] Cifrado KMS real (encrypt/decrypt, key policies)
- [ ] CloudTrail + CloudWatch Logs + X-Ray integration
- [ ] Cost Explorer + Budgets + Anomaly Detection
- [ ] Drift detection en AWS (Config Rules, driftctl)
- [ ] Disaster Recovery drill (cross-region restore)

---

## 10. Expediente de promoción (entregable)

### 10.1. Estructura del expediente

```
expediente-promocion/
├── 01-arquitectura.md           # Diagrama + decisiones
├── 02-diferencias.md            # Tabla LocalStack vs AWS Real
├── 03-proveedor-refactorizado.md # providers.tf local vs real
├── 04-checklist-promocion.md    # Checklist 8.1-8.9 completado
├── 05-pruebas-complementarias.md # Qué probar en AWS real
├── 06-estimacion-costes.md      # Estimación mensual + budgets
├── 07-plan-recuperacion.md      # RTO/RPO, DR drill
├── 08-decision-promocion.md     # GO/NO-GO + excepciones documentadas
└── 09-evidencias-localstack/    # Capturas, logs, outputs locales
```

### 10.2. Decisión de promoción

| Decisión | Criterio |
|----------|----------|
| **GO** | Todos los checks ✅, excepciones documentadas y aceptadas |
| **CONDITIONAL GO** | Checks críticos ✅, algunos menores pendientes con plan |
| **NO-GO** | Checks críticos ❌, bloqueos sin mitigar |

---

## 11. Sesiones guiadas

### 11.1. Sesión 1: Análisis de diferencias (35 min)

1. Revisar tablas de diferencias por servicio (sección 6)
2. Identificar 5 diferencias críticas para tu arquitectura
3. Documentar en `02-diferencias.md`
4. **Entrega**: Tabla de diferencias priorizadas

### 11.2. Sesión 2: Refactorización de proveedor (30 min)

1. Crear `providers-real.tf` basado en sección 7.2
2. Identificar qué recursos necesitan cambios (nombres bucket, IAM, etc.)
3. Documentar en `03-proveedor-refactorizado.md`
4. **Entrega**: Diff proveedor local vs real + lista de cambios necesarios

### 11.3. Sesión 3: Checklist y decisión (35 min)

1. Completar checklist 8.1-8.9 (marcar ✅/❌/N/A)
2. Identificar 3 bloqueos críticos y plan de mitigación
3. Redactar decisión de promoción (GO/CONDITIONAL/NO-GO)
4. **Entrega**: Checklist completado + decisión justificada

---

## 12. Ejercicios de refuerzo

### 12.1. Ejercicio de identificación

Para cada afirmación, indica si es VERDADERA o FALSA en AWS Real:

1. "Los nombres de bucket S3 son únicos globalmente."
2. "LocalStack evalúa Conditions IAM igual que AWS."
3. "Las cuotas de Lambda son ilimitadas por defecto."
4. "S3 Object Lock está disponible en LocalStack."
5. "DynamoDB Global Tables funcionan en LocalStack."

### 12.2. Ejercicio de interpretación

Tu pipeline en LocalStack usa:
- Bucket `mis-documentos`
- Cola SQS `procesamiento` con DLQ
- Lambda Python 3.11 con 256MB/30s
- DynamoDB On-Demand con GSI

¿Qué 3 cambios son OBLIGATORIOS antes de ir a AWS Real? Justifica cada uno.

### 12.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un checklist de promoción personalizado para una arquitectura:
S3 → SNS → SQS (DLQ) → Lambda → DynamoDB (GSI + TTL)
Incluye: IAM, Red, Estado, Seguridad, Cuotas, Costes, Observabilidad, Resiliencia, CI/CD.
Formato: tabla con columnas [Check, Estado, Evidencia, Responsable, Fecha].
```

---

## 13. Limitaciones finales de LocalStack

| Categoría | LocalStack | AWS Real |
|-----------|------------|----------|
| **Propósito** | Desarrollo, pruebas, CI | Producción, cargas reales |
| **Alcance** | Subconjunto de APIs | 200+ servicios completos |
| **Fidelidad** | Sintaxis + contratos | Comportamiento real |
| **Coste** | Hardware local | Pay-per-use |
| **Responsabilidad** | Desarrollador | Compartida (AWS + Cliente) |

---

## 14. Evaluación y cierre del curso

### 14.1. Rúbrica final (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Diferencias | No identifica | Lista básica | Priorizadas + justificadas |
| Refactorización | No hace | Parcial | Completa + lista cambios |
| Checklist | No usa | Parcial | Completa + evidencias |
| Decisión | No toma | Parcial | Justificada + excepciones |
| Expediente | No entrega | Parcial | Completo + profesional |

### 14.2. Checklist final del curso

- [ ] Diferencias LocalStack vs AWS documentadas por servicio
- [ ] Proveedor refactorizado (local → real) documentado
- [ ] Checklist de promoción completado (8 secciones)
- [ ] Pruebas complementarias identificadas
- [ ] Expediente de promoción entregado
- [ ] Decisión de promoción justificada
- [ ] Laboratorio LocalStack limpio (`destroy` + `list-*` vacíos)

### 14.3. Idea principal del curso

> **Terraform + LocalStack = aprendizaje seguro. Terraform + AWS Real = responsabilidad compartida.**
> LocalStack te enseña a escribir, estructurar y probar.
> AWS Real te exige: identidad, red, estado, seguridad, cuotas, costes, operación.
> **El emulador es el gimnasio. La nube real es la competición.**
> **Entrena bien. Compite con responsabilidad.**

---

## 15. Recursos para seguir aprendiendo

- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [LocalStack Documentation](https://docs.localstack.cloud/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Well-Architected Labs](https://wellarchitectedlabs.com/)
- [Terraform Best Practices](https://github.com/terraform-best-practices)
- [AWS Well-Architected Tool](https://aws.amazon.com/well-architected-tool/)

---

**¡Fin del curso\!** 

Has completado el recorrido desde los fundamentos de Terraform hasta la preparación para producción en AWS.
Recuerda: **la infraestructura es código, pero la operación es cultura.**
¡Éxitos en tus proyectos con Terraform y AWS\!
