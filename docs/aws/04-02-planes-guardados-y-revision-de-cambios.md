# Planes guardados y revisión de cambios en Terraform

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Guardar un plan (`-out`) permite separar la planificación de la ejecución.
Esto habilita revisión colaborativa, auditoría, y aplicación segura sin sorpresas.
Esta lección cubre el ciclo completo: plan guardado, inspección, revisión en equipo, y aplicación controlada.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar la diferencia entre `plan` interactivo y plan guardado.
- Entender por qué separar planificación y aplicación mejora la seguridad.
- Identificar qué información contiene un archivo `.tfplan`.
- Reconocer cuándo un plan guardado se vuelve obsoleto.

### 1.2. Objetivos prácticos

También podrás:

- Generar planes guardados con `-out`.
- Inspeccionar planes con `terraform show`.
- Convertir plan a JSON para análisis automatizado.
- Aplicar planes guardados sin confirmación interactiva.
- Detectar planes obsoletos (drift, cambios de configuración).

---

## 2. Requisitos previos

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

Conocimientos: ciclo básico (lección 04-01), HCL, variables, outputs.

---

## 3. Configuración del laboratorio

### 3.1. Arquitectura

```
Terraform (planes guardados)       aws_local (verificación)
     │                                  │
     ▼                                  ▼
http://127.0.0.1:4566 (LocalStack S3)
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

---

## 4. Plan interactivo vs plan guardado

### 4.1. Plan interactivo (por defecto)

```bash
terraform plan
```
- Muestra plan en consola.
- Pide confirmación si se ejecuta `terraform apply` sin plan guardado.
- No persiste el plan.

### 4.2. Plan guardado (`-out`)

```bash
terraform plan -out=creacion.tfplan
```
- Guarda plan binario en archivo.
- `terraform show creacion.tfplan` → inspección legible.
- `terraform show -json creacion.tfplan` → JSON para automatización.
- `terraform apply creacion.tfplan` → aplica **sin pedir confirmación**.

> **Regla de oro**: Siempre `show` antes de `apply` un plan guardado.

---

## 5. Estructura de un plan guardado

El archivo `.tfplan` es binario (formato interno de Terraform).
Contiene:
- Acciones propuestas (crear, actualizar, destruir).
- Valores de atributos (conocidos y unknown).
- Dependencias entre recursos.
- Metadatos: versión Terraform, provider, timestamp.

### 5.1. Inspección legible

```bash
terraform show creacion.tfplan
```

Salida ejemplo:
```
Plan: 2 to add, 0 to change, 0 to destroy.

+ aws_s3_bucket.demo
    bucket: "tf-demo-001"
    tags: { "Leccion" = "PlanesGuardados" }
    versioning: [ { enabled = true } ]

+ aws_s3_object.demo
    bucket: "tf-demo-001"
    key: "docs/archivo.txt"
    content: "Contenido inicial"
```

### 5.2. Inspección JSON (para automatización)

```bash
terraform show -json creacion.tfplan | jq '.planned_values.root_module.resources[] | {type: .type, name: .name, actions: .actions}'
```

---

## 6. Flujo de trabajo con revisión

### 6.1. Flujo individual

```bash
# 1. Planificar y guardar
terraform plan -out=cambio.tfplan

# 2. Inspeccionar
terraform show cambio.tfplan

# 3. Aplicar (sin confirmación interactiva)
terraform apply cambio.tfplan
```

### 6.2. Flujo colaborativo (revisión en equipo)

```bash
# Autor: genera plan
terraform plan -out=feature-xyz.tfplan
terraform show feature-xyz.tfplan > plan-review.txt
# Comparte plan-review.txt (PR, ticket, chat)

# Revisor: inspecciona
terraform show feature-xyz.tfplan
# Verifica: recursos correctos, no destrucciones inesperadas, tags, naming

# Autor: aplica tras aprobación
terraform apply feature-xyz.tfplan
```

### 6.3. Flujo con CI/CD

```yaml
# .github/workflows/terraform.yml
- name: Plan
  run: |
    terraform plan -out=tfplan
    terraform show -json tfplan > tfplan.json
    
- name: Upload plan artifact
  uses: actions/upload-artifact@v4
  with:
    name: terraform-plan
    path: tfplan.json

- name: Apply (manual approval)
  if: github.event_name == 'workflow_dispatch'
  run: terraform apply tfplan
```

---

## 7. Planes obsoletos y drift

Un plan guardado refleja el estado **en el momento de su creación**.
Se vuelve obsoleto si:

1. **Cambia la configuración** (`.tf` modificado).
2. **Cambia el estado remoto** (otro `apply`, `import`, `state mv`).
3. **Drift externo** (cambio via `aws_local`, consola AWS, otro equipo).

### 7.1. Detectar plan obsoleto

```bash
# Generar plan
terraform plan -out=old.tfplan

# Modificar configuración (ej. cambiar tag)
# O hacer drift externo:
aws_local s3api put-bucket-tagging --bucket tf-demo-001 --tagging 'TagSet=[{Key=Externo,Value=true}]'

# Intentar aplicar plan viejo
terraform apply old.tfplan
# Terraform detecta discrepancia y puede fallar o comportarse inesperadamente
```

### 7.2. Regla: regenerar plan ante cualquier duda

```bash
# Ante cualquier cambio: configuración, estado, drift sospechoso
terraform plan -out=nuevo.tfplan
terraform show nuevo.tfplan
terraform apply nuevo.tfplan
```

---

## 8. Análisis automatizado de planes

### 8.1. Extraer resumen en JSON

```bash
terraform show -json creacion.tfplan | jq '
  {
    add:    (.resource_changes[] | select(.change.actions[] == "create") | .address),
    update: (.resource_changes[] | select(.change.actions[] == "update") | .address),
    delete: (.resource_changes[] | select(.change.actions[] == "delete") | .address)
  }
'
```

### 8.2. Verificar políticas (ej. naming, tags obligatorios)

```bash
# Script: check-plan.sh
#\!/bin/bash
terraform show -json "$1" | jq -r '
  .resource_changes[] 
  | select(.change.actions[] == "create")
  | select(.type == "aws_s3_bucket")
  | .change.after.tags
  | if has("Leccion") then empty else "FALTA TAG Leccion: \(.address)" end
'
```

### 8.3. Estimación de costes (conceptual)

```bash
# En AWS real: integra con Infracost, Terratest, etc.
# En LocalStack: simulación
terraform show -json creacion.tfplan | jq '
  .resource_changes[] 
  | select(.type == "aws_s3_bucket")
  | "Bucket: \(.change.after.bucket) - Versioning: \(.change.after.versioning[0].enabled // false)"
'
```

---

## 9. Práctica guiada

### Paso 1: Preparar

```bash
mkdir -p planes-guardados/evidencias
cd planes-guardados
docker compose up -d
source .env.localstack
```

### Paso 2: Configuración base

```hcl
# versions.tf, providers.tf (estándar)

# variables.tf
variable "bucket_name" { type = string, default = "tf-planes-001" }
variable "versioning"  { type = bool, default = false }

# locals.tf
locals { tags = { Leccion = "PlanesGuardados" } }

# main.tf
resource "aws_s3_bucket" "demo" {
  bucket = var.bucket_name
  tags = local.tags
  versioning { enabled = var.versioning }
}

resource "aws_s3_object" "doc" {
  bucket = aws_s3_bucket.demo.bucket
  key    = "docs/readme.txt"
  content = "Documentación de planes guardados"
}

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.demo.bucket }
```

### Paso 3: Plan inicial y aplicación

```bash
terraform init
terraform fmt
terraform validate

# Plan guardado
terraform plan -out=inicial.tfplan
terraform show inicial.tfplan

# Aplicar
terraform apply inicial.tfplan

# Verificar
aws_local s3api head-bucket --bucket tf-planes-001
aws_local s3api get-bucket-versioning --bucket tf-planes-001
```

### Paso 4: Cambio con revisión

```bash
# Cambiar configuración: habilitar versioning
# En variables.tf o -var: versioning = true

# Nuevo plan guardado
terraform plan -out=versioning.tfplan
terraform show versioning.tfplan
# Revisar: ~ versioning.enabled

# Aplicar
terraform apply versioning.tfplan

# Verificar
aws_local s3api get-bucket-versioning --bucket tf-planes-001
```

### Paso 5: Drift externo y plan obsoleto

```bash
# Drift: añadir tag via aws_local (fuera de Terraform)
aws_local s3api put-bucket-tagging \
  --bucket tf-planes-001 \
  --tagging 'TagSet=[{Key=Leccion,Value=PlanesGuardados},{Key=Externo,Value=Drift}]'

# Plan viejo (inicial.tfplan) ya no refleja realidad
# Intentar aplicar plan viejo:
terraform apply inicial.tfplan
# Observar: puede fallar o comportarse raro

# Regenerar plan
terraform plan -out=drift.tfplan
terraform show drift.tfplan
# Ver: ~ tags.Externo se añade (Terraform propone quitarlo)

# Aplicar plan corregido
terraform apply drift.tfplan
```

### Paso 6: Análisis JSON automatizado

```bash
# Extraer acciones
terraform show -json drift.tfplan | jq '
  .resource_changes[] 
  | {address: .address, actions: .change.actions, type: .type}
'

# Verificar tags obligatorios
terraform show -json drift.tfplan | jq -r '
  .resource_changes[] 
  | select(.type == "aws_s3_bucket")
  | .change.after.tags
  | if has("Leccion") then "OK: \(.Leccion)" else "FALTA Leccion" end
'
```

### Paso 7: Limpiar

```bash
terraform plan -destroy -out=destroy.tfplan
terraform show destroy.tfplan
terraform apply destroy.tfplan

aws_local s3api list-buckets
docker compose down
```

---

## 10. Sesiones guiadas

### 10.1. Sesión 1: Plan guardado básico (25 min)

1. Generar `plan -out=inicial.tfplan`
2. `show` legible + `show -json` para JSON
3. `apply` plan guardado
4. **Entrega**: Plan legible + JSON actions + verificación

### 10.2. Sesión 2: Revisión colaborativa (30 min)

1. Parejas: uno genera plan, otro revisa `show`
2. Revisor identifica: recursos, acciones, tags, riesgos
3. Intercambian roles
4. **Entrega**: Checklist de revisión completado por ambos

### 10.3. Sesión 3: Drift y planes obsoletos (25 min)

1. Introducir drift externo con `aws_local`
2. Intentar aplicar plan viejo → observar comportamiento
3. Regenerar plan → aplicar corregido
5. Análisis JSON automatizado
6. **Entrega**: Evidencia drift + plan regenerado + script análisis

---

## 11. Ejercicios de refuerzo

### 11.1. Ejercicio de identificación

Diferencia entre:
- `terraform plan` vs `terraform plan -out=archivo.tfplan`
- `terraform apply` vs `terraform apply archivo.tfplan`
- Plan guardado vs estado (`terraform.tfstate`)

### 11.2. Ejercicio de interpretación

Un equipo guarda `plan.tfplan` el lunes.
El martes, otro miembro hace `terraform apply` directo (sin plan).
El miércoles, el primero intenta `terraform apply plan.tfplan`.
¿Qué ocurre? ¿Por qué?

### 11.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un script Bash que reciba un archivo .tfplan y:
1. Valide que no hay acciones "delete" en recursos críticos (S3 bucket, DynamoDB table)
2. Valide que todos los buckets creados tienen tag "Leccion"
3. Genere reporte: total create/update/delete, recursos por tipo
Usa: terraform show -json, jq. Exit code 0 si OK, 1 si falla validaciones.
```

---

## 12. Limitaciones LocalStack

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Planes guardados | ✅ Idéntico | ✅ |
| `show -json` | ✅ | ✅ |
| Drift detection | ✅ | ✅ |

---

## 13. Diagnóstico de errores

| Error | Causa | Solución |
|-------|-------|----------|
| `Saved plan is stale` | Configuración/estado cambió tras plan | Regenerar plan |
| `Plan file not found` | Ruta incorrecta | Verificar path relativo/absoluto |
| `Cannot apply stale plan` | Drift detectado al aplicar | Regenerar plan |
| `Error decoding plan` | Archivo corrupto / versión incompatible | Regenerar con misma versión Terraform |

---

## 14. Evaluación y cierre

### 14.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Plan guardado | No usa | Genera pero no inspecciona | Genera + show + show -json |
| Revisión | No revisa | Revisa solo | Revisa en pareja + checklist |
| Drift/Obsoleto | No detecta | Detecta sin resolver | Detecta + regenera + aplica corregido |
| Análisis JSON | No usa | Básico | Script automatizado + validaciones |

### 14.2. Checklist final

- [ ] `terraform plan -out=archivo.tfplan` usado
- [ ] `terraform show archivo.tfplan` inspeccionado
- [ ] `terraform show -json archivo.tfplan` analizado con jq
- [ ] `terraform apply archivo.tfplan` sin confirmación interactiva
- [ ] Revisión en pareja documentada
- [ ] Drift introducido y detectado via plan regenerado
- [ ] Script análisis JSON funcional
- [ ] Limpieza completa

### 14.3. Idea principal

> **Planificar ≠ Aplicar. Separar permite revisar, auditar, automatizar.**
> `terraform plan -out` + `show` + `apply` = flujo seguro.
> **Un plan guardado es una foto del pasado. Si la realidad cambia, regenera la foto.**
> **`terraform show -json` + `jq` = puertas abiertas a automatización y políticas.**
