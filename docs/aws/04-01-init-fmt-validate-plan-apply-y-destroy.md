# Terraform: `init`, `fmt`, `validate`, `plan`, `apply` y `destroy`

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Terraform utiliza varios comandos para preparar, revisar y ejecutar una configuración.
Cada comando cumple una responsabilidad diferente.
Aprender su secuencia permite trabajar con más seguridad y diagnosticar errores sin improvisar.

En esta lección recorrerás el ciclo completo de un proyecto.
Prepararás el entorno, crearás recursos, modificarás su configuración y eliminarás el laboratorio.
La plataforma de referencia será AWS.
Los recursos se ejecutarán únicamente en S3 emulado mediante LocalStack.

---

## 1. Objetivos de aprendizaje

### 1.1. Conocimientos principales

Al finalizar podrás:

- Explicar la responsabilidad de cada comando.
- Inicializar un directorio de trabajo.
- Aplicar formato consistente.
- Validar una configuración.
- Generar e interpretar un plan.
- Aplicar cambios previamente revisados.
- Verificar recursos fuera de Terraform.
- Destruir una infraestructura de práctica.
- Reconocer errores de configuración y conectividad.
- Comprender la función del estado y del archivo de bloqueo.

### 1.2. Resultado práctico

Crearás un bucket S3 y un objeto de texto.
Modificarás etiquetas y contenido sin cambiar sus nombres.
Después generarás un plan de destrucción y comprobarás la limpieza.

---

## 2. Requisitos previos

### 2.1. Herramientas

Comprueba:

```bash
terraform version
docker version
docker compose version
aws --version
```

El laboratorio utiliza:

- Terraform 1.6 o superior dentro de la serie 1.x.
- Un proveedor AWS de la serie 5.x.
- Docker Compose.
- AWS CLI.
- Una imagen de LocalStack validada para S3.

### 2.2. Conocimientos recomendados

Debes reconocer variables, recursos, locales y outputs.
Los comandos de terminal utilizan una shell compatible con Bash.
Terraform y AWS CLI se ejecutan en el host.

---

## 3. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 3.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────────┐                    │
│  │   Terraform  │  │   aws_local()    │                    │
│  │   (comandos) │  │  (verificación)  │                    │
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
│  │  │  Bucket S3 + Objeto para ciclo completo        │   │  │
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
      SERVICES: s3,sts
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
  s3_use_path_style = true
  endpoints { s3 = "http://127.0.0.1:4566", sts = "http://127.0.0.1:4566" }
}

# variables.tf
variable "bucket_name" { type = string, default = "tf-ciclo-completo-001" }
variable "object_key"  { type = string, default = "docs/archivo.txt" }
variable "object_content" { type = string, default = "Contenido inicial" }

# locals.tf
locals {
  tags = { Leccion = "CicloCompleto", Gestionado = "Terraform" }
}

# main.tf
resource "aws_s3_bucket" "demo" {
  bucket = var.bucket_name
  tags = local.tags
}

resource "aws_s3_object" "demo" {
  bucket = aws_s3_bucket.demo.bucket
  key    = var.object_key
  content = var.object_content
  content_type = "text/plain"
}

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.demo.bucket }
output "bucket_arn"  { value = aws_s3_bucket.demo.arn }
output "object_etag" { value = aws_s3_object.demo.etag }
```

---

## 4. Visión general del ciclo de trabajo

### 4.1. Responsabilidades

| **Comando** | **Responsabilidad** | **¿Modifica recursos?** |
|-------------|---------------------|-------------------------|
| `init` | Preparar backend, módulos y proveedores | No crea los recursos declarados |
| `fmt` | Ajustar formato | No |
| `validate` | Comprobar consistencia de configuración | No |
| `plan` | Calcular acciones propuestas | No aplica esas acciones |
| `apply` | Ejecutar acciones | Sí |
| `destroy` | Eliminar recursos gestionados | Sí |

El efecto concreto de cada ejecución depende de sus opciones y del contexto.

### 4.2. Secuencia recomendada

```text
Preparar → Inicializar → Formatear → Validar
                                   ↓
Verificar ← Aplicar ← Revisar ← Planificar
    ↓
Planificar destrucción → Revisar → Destruir
```

---

## 5. Configuración, estado y objetos remotos

Terraform compara tres fuentes de información:

| Fuente | Qué contiene | Quién la gestiona |
|--------|--------------|-------------------|
| **Configuración** (`.tf`) | Intención declarada | Tú (archivos) |
| **Estado** (`terraform.tfstate`) | Relaciones y atributos registrados | Terraform |
| **API remota** (LocalStack) | Objetos reales y sus propiedades | Proveedor (AWS/LocalStack) |

Un plan calcula la diferencia entre **configuración** y **estado**, consultando la **API** para datos actuales.
Un apply modifica la **API** y actualiza el **estado**.
Un destroy elimina de la **API** y del **estado**.

---

## 6. `terraform init` - Inicialización

### 6.1. Qué hace

- Crea el directorio `.terraform/`.
- Descarga los proveedores declarados en `required_providers`.
- Inicializa el backend (local por defecto).
- Genera o actualiza `.terraform.lock.hcl`.

### 6.2. Opciones útiles

```bash
terraform init                    # Estándar
terraform init -upgrade           # Reconsidera versiones dentro de restricciones
terraform init -migrate-state     # Migra estado al nuevo backend
terraform init -reconfigure       # Descarta configuración backend previa
```

### 6.3. Qué NO hace

- No crea recursos.
- No valida la configuración (eso es `validate`).
- No comprueba conectividad con LocalStack (solo descarga provider).

### 6.4. Práctica

```bash
mkdir -p ciclo-completo/evidencias
cd ciclo-completo
docker compose up -d
source .env.localstack

# Crear archivos Terraform (sección 3.4)
terraform init
# Observar: descarga provider, crea .terraform.lock.hcl
```

---

## 7. `terraform fmt` - Formateo

### 7.1. Qué hace

Reescribe archivos `.tf` para seguir el estilo canónico de Terraform:
- Indentación (2 espacios).
- Espaciado alrededor de `=`, `{`, `}`, `[`, `]`, `,`.
- Ordenación de argumentos (opcional).
- Saltos de línea consistentes.

### 7.2. Opciones

```bash
terraform fmt           # Modifica archivos in-place
terraform fmt -check    # Solo verifica, exit code 0=ok, 1=cambios necesarios
terraform fmt -diff     # Muestra diff sin modificar
terraform fmt -recursive # Incluye submódulos
```

### 7.3. Integración en CI

```bash
# En pipeline: falla si hay formato incorrecto
terraform fmt -check -recursive
```

### 7.4. Práctica

```bash
# Introducir formato inconsistente a propósito
terraform fmt -check  # Debe fallar
terraform fmt         # Corrige
terraform fmt -check  # Debe pasar
```

---

## 8. `terraform validate` - Validación estática

### 8.1. Qué comprueba

- Sintaxis HCL correcta.
- Tipos de argumentos compatibles.
- Referencias a recursos/variables existentes.
- Argumentos requeridos presentes.
- Validaciones de variables (`validation` block).
- Ciclos de dependencia.

### 8.2. Qué NO comprueba

- Conectividad con LocalStack/AWS.
- Existencia de recursos en la API.
- Permisos IAM.
- Cuotas o límites de servicio.
- Valores que solo se conocen en apply.

### 8.3. Práctica

```bash
terraform validate  # Debe pasar

# Introducir error: argumento inexistente en resource
terraform validate  # Debe fallar con mensaje claro
# Corregir
terraform validate  # Debe pasar
```

---

## 9. `terraform plan` - Planificación

### 9.1. Qué hace

1. Refresca el estado consultando la API (refresh).
2. Compara configuración vs estado actualizado.
3. Calcula acciones necesarias.
4. Muestra resumen y detalles.

### 9.2. Símbolos del plan

| Símbolo | Significado |
|---------|-------------|
| `+` | Crear recurso |
| `~` | Actualizar in-place |
| `-` | Destruir recurso |
| `-/+` | Reemplazar (destruir + crear) |
| `<=` | Leer (data source) |

### 9.3. Opciones clave

```bash
terraform plan                    # Plan interactivo
terraform plan -out=archivo.tfplan # Guarda plan binario
terraform plan -destroy           # Plan de destrucción
terraform plan -var="x=y"         # Sobreescribe variable
terraform plan -target=recurso    # Solo ese recurso (¡cuidado\!)
```

### 9.4. Planes guardados (recomendado para apply)

```bash
terraform plan -out=creacion.tfplan
terraform show creacion.tfplan    # Inspecciona plan guardado
terraform apply creacion.tfplan   # Aplica SIN confirmación interactiva
```

> **Regla**: Siempre revisa el plan (`show`) antes de aplicar un plan guardado.

### 9.5. Valores desconocidos

Algunos atributos aparecen como `(known after apply)`.
No inventes su valor. Son determinados por la API tras la creación.

### 9.6. Práctica

```bash
terraform plan -out=creacion.tfplan
terraform show creacion.tfplan
# Identificar: + aws_s3_bucket.demo, + aws_s3_object.demo
# Atributos conocidos vs unknown
```

---

## 10. `terraform apply` - Aplicación

### 10.1. Modos

```bash
# Interactivo: muestra plan y pide confirmación
terraform apply

# Desde plan guardado: NO pide confirmación (ya revisaste)
terraform apply creacion.tfplan

# Con variables
terraform apply -var="bucket_name=otro-bucket"
```

### 10.2. Confirmación interactiva

Escribe exactamente `yes` (o lo que pida tu versión) para confirmar.
No uses `-auto-approve` en prácticas de aprendizaje.

### 10.3. Qué ocurre durante apply

1. Bloquea el estado (local: archivo `.terraform.tfstate.lock.info`).
2. Ejecuta acciones en orden de dependencias.
3. Actualiza estado tras cada recurso.
4. Libera bloqueo.
5. Muestra outputs.

### 10.4. Práctica

```bash
terraform apply creacion.tfplan
# Verificar outputs
terraform output

# Verificar con aws_local (independiente)
aws_local s3api head-bucket --bucket tf-ciclo-completo-001
aws_local s3api head-object --bucket tf-ciclo-completo-001 --key docs/archivo.txt
aws_local s3api get-object --bucket tf-ciclo-completo-001 --key docs/archivo.txt /tmp/verificado.txt
diff <(echo -n "Contenido inicial") /tmp/verificado.txt
```

---

## 11. Modificación y convergencia

### 11.1. Cambiar configuración

```hcl
# En main.tf, modificar tags del bucket:
tags = merge(local.tags, { Modificado = "true", Version = "2" })

# En variables.tf o -var:
# object_content = "Contenido modificado"
```

### 11.2. Ciclo de cambio

```bash
terraform fmt
terraform validate
terraform plan -out=modificacion.tfplan
terraform show modificacion.tfplan
# Revisar: ~ tags, ~ content
terraform apply modificacion.tfplan
```

### 11.3. Convergencia

```bash
terraform plan
# "No changes. Infrastructure is up-to-date."
# Significa: configuración == estado == API (dentro del alcance evaluado)
```

### 11.4. Verificación independiente

```bash
aws_local s3api get-bucket-tagging --bucket tf-ciclo-completo-001
aws_local s3api get-object --bucket tf-ciclo-completo-001 --key docs/archivo.txt /tmp/v2.txt
cat /tmp/v2.txt
```

---

## 12. `terraform destroy` - Destrucción

### 12.1. Plan de destrucción

```bash
terraform plan -destroy -out=destroy.tfplan
terraform show destroy.tfplan
# Verificar: - aws_s3_object.demo, - aws_s3_bucket.demo
```

### 12.2. Aplicar destrucción

```bash
terraform apply destroy.tfplan
# O interactivo: terraform destroy
```

### 12.3. Verificación de limpieza

```bash
# Estado Terraform
terraform state list  # Vacío

# API LocalStack
aws_local s3api list-buckets  # Vacío
aws_local s3api list-objects-v2 --bucket tf-ciclo-completo-001 2>&1 | head -3
# Debe dar error NoSuchBucket
```

### 12.4. Detener LocalStack

```bash
docker compose down
```

---

## 13. Archivos de estado y bloqueo

### 13.1. `terraform.tfstate`

- JSON con recursos gestionados, atributos, dependencias.
- **Sensible**: puede contener secretos.
- No editar manualmente (salvo operaciones avanzadas módulo 07).
- Backend local = archivo en disco. Backend remoto = S3 + DynamoDB (módulo 07).

### 13.2. `.terraform.lock.hcl`

- Versiones exactas de proveedores seleccionadas.
- Hashes de integridad.
- **Debe versionarse en Git**.

### 13.3. `.terraform/`

- Directorio con plugins de proveedores descargados.
- **No versionar** (en `.gitignore`).

---

## 14. Sesiones guiadas para el alumnado

### 14.1. Sesión 1: Init, fmt, validate, plan (30 min)

1. Crear configuración base
2. `init` → observar `.terraform/` y `.terraform.lock.hcl`
3. `fmt -check` → `fmt` → `validate`
4. `plan -out=creacion.tfplan` → `show` → analizar símbolos
5. **Entrega**: Plan analizado + explicación de cada símbolo

### 14.2. Sesión 2: Apply, verificación, modificación (35 min)

1. `apply creacion.tfplan`
2. Verificar con `terraform output` + `aws_local` (dual)
3. Modificar tags y contenido → `plan` → `apply`
4. Verificar convergencia (`plan` sin cambios)
5. **Entrega**: Evidencias verificación dual + plan modificación + convergencia

### 14.3. Sesión 3: Destroy y limpieza (20 min)

1. `plan -destroy` → `show` → `apply`
2. Verificar: `state list` vacío + `aws_local list-buckets` vacío
3. `docker compose down`
4. **Entrega**: Evidencias limpieza completa + explicación orden de operaciones

---

## 15. Ejercicios de refuerzo

### 15.1. Ejercicio de identificación

Relaciona cada comando con su responsabilidad:

| Comando | Responsabilidad |
|---------|-----------------|
| `init` | |
| `fmt` | |
| `validate` | |
| `plan` | |
| `apply` | |
| `destroy` | |

### 15.2. Ejercicio de interpretación

¿Qué pasa si:
1. Ejecutas `apply` sin `init` previo?
2. Ejecutas `plan` tras `apply` exitoso?
3. Modificas un archivo `.tf` y ejecutas `apply` sin `plan`?
4. Ejecutas `destroy` con LocalStack detenido?

### 15.3. Ejercicio con asistente de IA

```text
Instrucción:
Explica la diferencia entre `terraform plan` y `terraform plan -out=archivo.tfplan`.
¿Por qué se recomienda usar planes guardados para `apply`?
Incluye: revisión, confirmación, reproducibilidad, seguridad.
```

---

## 16. Limitaciones de LocalStack en el ciclo

| Comando | LocalStack | AWS Real |
|---------|------------|----------|
| `init` | ✅ Idéntico | ✅ |
| `fmt` | ✅ Idéntico | ✅ |
| `validate` | ✅ Idéntico | ✅ |
| `plan` | ✅ (consulta API local) | ✅ (consulta API real) |
| `apply` | ✅ (latencia sub-ms) | ✅ (latencia ms, throttling) |
| `destroy` | ✅ | ✅ |
| Estado local | ✅ Archivo | ✅ Archivo o S3+DynamoDB |
| Bloqueo estado | ✅ Archivo local | ✅ DynamoDB (backend remoto) |

---

## 17. Diagnóstico de errores frecuentes

| Error | Comando | Causa | Solución |
|-------|---------|-------|----------|
| `Provider not initialized` | `plan`/`apply` | Falta `init` | `terraform init` |
| `Configuration validation failed` | `validate` | Error sintaxis/tipos | Leer mensaje, corregir `.tf` |
| `Error acquiring state lock` | `apply`/`destroy` | Proceso previo colgado | Eliminar `.terraform.tfstate.lock.info` |
| `Resource already exists` | `apply` | Recurso en API no en estado | `import` o limpiar API |
| `Provider produced inconsistent result` | `apply` | Bug provider / eventualidad | Reintentar, revisar versión provider |

---

## 18. Evaluación y cierre

### 18.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Init | No ejecuta | Ejecuta sin entender | Ejecuta + explica lock file + backend |
| Fmt/Validate | No usa | Usa básico | Usa + integra en CI + corrige errores |
| Plan | No revisa | Revisa superficial | Analiza símbolos, unknowns, dependencias |
| Apply | Sin plan guardado | Interactivo | Plan guardado + show + apply + verificación dual |
| Destroy | No verifica | Solo `destroy` | Plan destroy + show + apply + verificación API |
| Estado | No conoce | Conoce archivo | Explica estado vs config vs API + lock file |

### 18.2. Checklist final

- [ ] `terraform init` ejecutado y `.terraform.lock.hcl` creado
- [ ] `terraform fmt -check` pasa
- [ ] `terraform validate` pasa
- [ ] `terraform plan -out=creacion.tfplan` revisado con `show`
- [ ] `terraform apply creacion.tfplan` ejecutado
- [ ] Verificación dual: `terraform output` + `aws_local`
- [ ] Modificación → `plan` → `apply` → convergencia verificada
- [ ] `terraform plan -destroy -out=destroy.tfplan` revisado
- [ ] `terraform apply destroy.tfplan` ejecutado
- [ ] `terraform state list` vacío
- [ ] `aws_local s3api list-buckets` vacío
- [ ] `docker compose down`

### 18.3. Idea principal

> **El ciclo no es lineal: es un bucle de retroalimentación.**
> `plan` te dice QUÉ pasará. `apply` lo EJECUTA. `aws_local` CONFIRMA la realidad.
> **Nunca apliques sin revisar el plan. Nunca des por hecho sin verificar en la API.**
> **El estado es la memoria de Terraform; cuídalo, versiona el lock, no lo edites a mano.**
