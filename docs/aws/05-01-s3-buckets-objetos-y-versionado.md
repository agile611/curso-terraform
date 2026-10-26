# S3: buckets, objetos y versionado con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Amazon S3 almacena objetos dentro de buckets y permite conservar varias versiones de una misma clave.
Terraform declara los buckets, su configuración y los objetos que debe gestionar.
LocalStack permite practicar estas operaciones mediante una emulación local de las API de AWS.

En esta lección recorrerás la creación, actualización, consulta, recuperación y eliminación de objetos versionados.
También distinguirás el estado de Terraform del historial de versiones que mantiene S3.
El laboratorio separa los objetos gestionados por Terraform de los utilizados para experimentar con `aws_local`.

---

## 1. Objetivos de aprendizaje

### 1.1. Qué aprenderás

Al finalizar podrás:

- Crear un bucket S3 con Terraform.
- Configurar el versionado mediante un recurso independiente.
- Publicar objetos desde cadenas y archivos.
- Consultar contenido y metadatos mediante `aws_local`.
- Identificar versiones mediante `VersionId`.
- Recuperar una versión anterior.
- Comprender los marcadores de eliminación (delete markers).
- Diferenciar eliminación lógica y eliminación permanente.
- Limpiar un bucket versionado.
- Reconocer límites relevantes de LocalStack.

### 1.2. Resultado práctico

Construirás un bucket versionado con dos objetos gestionados y un documento experimental.

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
```

El laboratorio utiliza Terraform 1.6 o superior dentro de la serie 1.x.
El proveedor AWS se limita a la serie 5.x como base didáctica.

### 2.2. Conocimientos recomendados

Debes reconocer recursos, variables, outputs, dependencias y planes guardados.
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
│  │   (gestión)  │  │  (verificación)  │                    │
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
│  │  │  Bucket versionado + objetos (Terraform + CLI) │   │  │
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
variable "bucket_name" { type = string, default = "tf-s3-versionado-001" }

# locals.tf
locals {
  tags = { Leccion = "S3Versionado", Gestionado = "Terraform" }
}
```

---

## 4. Qué es un bucket

Un bucket es el contenedor lógico donde S3 almacena objetos.

### 4.1. Identidad

Cada bucket tiene un nombre.
En AWS real, los nombres de buckets de propósito general deben ser únicos dentro de la partición correspondiente.

### 4.2. Configuración

Un bucket puede tener versionado, políticas, etiquetas y otras opciones.
Estas configuraciones no equivalen a objetos almacenados.

### 4.3. Responsabilidad

En el laboratorio, Terraform gestionará el bucket y su configuración de versionado.

### 4.4. Diferencia importante

Eliminar un archivo local no elimina automáticamente un objeto del bucket.
Las operaciones locales y remotas tienen ciclos independientes.

---

## 5. Qué es un objeto

Un objeto es una unidad de datos almacenada en S3.

### 5.1. Componentes principales

Un objeto incluye:

- Una clave (key / ruta).
- Un contenido (body).
- Metadatos (Content-Type, custom metadata, etc.).
- Información del servicio (ETag, LastModified, VersionId).
- Un identificador de versión cuando el versionado está activo.

### 5.2. Ejemplo

```
Bucket: tf-s3-versionado-001
Clave:  documentos/informe.txt
Contenido: "Versión 1 del informe"
VersionId: "abc123..."
```

---

## 6. Versionado en S3

### 6.1. Concepto

El versionado permite conservar múltiples variantes de un objeto bajo la misma clave.
Cada escritura genera una nueva versión con `VersionId` único.
La "versión actual" es la más reciente.
Las versiones anteriores permanecen accesibles.

### 6.2. Estados de versionado

| Estado | Significado |
|--------|-------------|
| `Disabled` (default) | Sin versionado. Sobrescribe objeto. |
| `Enabled` | Versionado activo. Cada put crea versión. |
| `Suspended` | Deja de crear versiones, conserva existentes. |

### 6.3. Recurso Terraform para versionado

```hcl
resource "aws_s3_bucket_versioning" "versionado" {
  bucket = aws_s3_bucket.demo.bucket
  versioning_configuration {
    status = "Enabled"
  }
}
```

> **Nota**: Es un recurso separado de `aws_s3_bucket`. Permite gestionar versionado independientemente.

---

## 7. Marcadores de eliminación (Delete Markers)

### 7.1. Qué son

Cuando eliminas un objeto en un bucket versionado:
- No se borra el contenido.
- S3 inserta un **delete marker** (marcador de eliminación) como nueva versión.
- El objeto parece "no existir" en listados normales.
- Las versiones anteriores siguen ahí.

### 7.3. Eliminación permanente

Para borrar realmente una versión (o el delete marker):
- Especifica `versionId` en la operación `delete-object`.
- Requiere permisos `s3:DeleteObjectVersion`.

---

## 8. Práctica guiada paso a paso

### Paso 1: Preparar

```bash
mkdir -p s3-versionado/evidencias
cd s3-versionado
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack
```

### Paso 2: Crear bucket y habilitar versionado

```hcl
# main.tf
resource "aws_s3_bucket" "demo" {
  bucket = var.bucket_name
  tags = local.tags
}

resource "aws_s3_bucket_versioning" "demo" {
  bucket = aws_s3_bucket.demo.bucket
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_object" "v1" {
  bucket = aws_s3_bucket.demo.bucket
  key    = "documentos/informe.txt"
  content = "Versión 1: Informe inicial"
  content_type = "text/plain"
}

resource "aws_s3_object" "v2" {
  bucket = aws_s3_bucket.demo.bucket
  key    = "documentos/informe.txt"
  content = "Versión 2: Informe actualizado"
  content_type = "text/plain"
}

# outputs.tf
output "bucket_name" { value = aws_s3_bucket.demo.bucket }
output "v1_version_id" { value = aws_s3_object.v1.version_id }
output "v2_version_id" { value = aws_s3_object.v2.version_id }
```

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=s3v.tfplan
terraform apply s3v.tfplan
```

### Paso 3: Verificar versiones con `aws_local`

```bash
# Listar todas las versiones
aws_local s3api list-object-versions --bucket tf-s3-versionado-001 | jq '.Versions[] | {Key, VersionId, IsLatest, Size}'

# Ver versión actual (latest)
aws_local s3api get-object --bucket tf-s3-versionado-001 --key documentos/informe.txt /tmp/actual.txt
cat /tmp/actual.txt

# Recuperar versión anterior (usar VersionId de v1)
V1_ID=$(terraform output -raw v1_version_id)
aws_local s3api get-object --bucket tf-s3-versionado-001 --key documentos/informe.txt --version-id $V1_ID /tmp/v1.txt
cat /tmp/v1.txt
```

### Paso 4: Eliminar objeto (crea delete marker)

```bash
# Eliminar versión actual
aws_local s3api delete-object --bucket tf-s3-versionado-001 --key documentos/informe.txt

# Verificar: listado normal no lo muestra
aws_local s3api list-objects-v2 --bucket tf-s3-versionado-001 --prefix documentos/

# Pero versiones sí lo muestran (con delete marker)
aws_local s3api list-object-versions --bucket tf-s3-versionado-001 | jq '.DeleteMarkers[] | {Key, VersionId, IsLatest}'
```

### Paso 5: Recuperar eliminando delete marker

```bash
# Obtener VersionId del delete marker
DM_ID=$(aws_local s3api list-object-versions --bucket tf-s3-versionado-001 | jq -r '.DeleteMarkers[] | select(.Key=="documentos/informe.txt" and .IsLatest==true) | .VersionId')

# Eliminar delete marker (restaura versión anterior)
aws_local s3api delete-object --bucket tf-s3-versionado-001 --key documentos/informe.txt --version-id $DM_ID

# Verificar: objeto restaurado
aws_local s3api list-objects-v2 --bucket tf-s3-versionado-001 --prefix documentos/
aws_local s3api get-object --bucket tf-s3-versionado-001 --key documentos/informe.txt /tmp/restaurado.txt
cat /tmp/restaurado.txt
```

### Paso 6: Eliminación permanente de versión específica

```bash
# Eliminar versión v1 permanentemente
aws_local s3api delete-object --bucket tf-s3-versionado-001 --key documentos/informe.txt --version-id $V1_ID

# Verificar: v1 ya no existe en versiones
aws_local s3api list-object-versions --bucket tf-s3-versionado-001 | jq '.Versions[] | {Key, VersionId, IsLatest}'
```

### Paso 7: Objeto experimental con `aws_local` (fuera de Terraform)

```bash
echo "Documento experimental CLI" > experimental.txt
aws_local s3api put-object --bucket tf-s3-versionado-001 --key experimental/doc.txt --body experimental.txt

# Verificar que Terraform NO lo ve
terraform plan  # No changes

# Listar versiones (incluye experimental)
aws_local s3api list-object-versions --bucket tf-s3-versionado-001
```

### Paso 8: Limpiar bucket versionado

```bash
# 1. Eliminar todas las versiones de objetos gestionados por Terraform
# (Terraform destroy lo hará si force_destroy = true, pero aquí usamos false)

# 2. Eliminar objeto experimental y sus versiones
aws_local s3api list-object-versions --bucket tf-s3-versionado-001 --prefix experimental/ | jq -r '.Versions[] | "\(.Key) \(.VersionId)"' | while read key vid; do
  aws_local s3api delete-object --bucket tf-s3-versionado-001 --key "$key" --version-id "$vid"
done

# 3. Eliminar delete markers también
aws_local s3api list-object-versions --bucket tf-s3-versionado-001 | jq -r '.DeleteMarkers[] | "\(.Key) \(.VersionId)"' | while read key vid; do
  aws_local s3api delete-object --bucket tf-s3-versionado-001 --key "$key" --version-id "$vid"
done

# 4. Destruir recursos Terraform
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan

# 5. Verificar limpieza total
aws_local s3api list-buckets
aws_local s3api list-object-versions --bucket tf-s3-versionado-001 2>&1 | head -5

# 6. Detener LocalStack
docker compose down
```

---

## 9. Sesiones guiadas para el alumnado

### 9.1. Sesión 1: Bucket + versionado + objetos (35 min)

1. Crear bucket, versionado, 2 objetos (v1, v2 misma clave)
2. `terraform apply` → verificar outputs con VersionIds
3. `aws_local list-object-versions` → identificar versiones
4. Recuperar v1 usando `--version-id`
5. **Entrega**: Evidencias de 2 versiones + recuperación exitosa

### 9.2. Sesión 2: Delete markers y recuperación (30 min)

1. `aws_local delete-object` (sin version-id) → crea delete marker
2. `list-object-versions` → ver delete marker como IsLatest
3. Eliminar delete marker con `--version-id` → restaurar
4. Eliminar versión específica permanentemente
5. **Entrega**: Capturas de cada paso + explicación delete marker vs versión

### 9.3. Sesión 3: Objetos fuera de Terraform y limpieza (25 min)

1. Subir objeto con `aws_local` → verificar que `terraform plan` no lo ve
2. Limpiar objeto experimental (todas sus versiones)
3. `terraform destroy` → verificar bucket eliminado
4. `docker compose down`
5. **Entrega**: Registro limpieza distinguida (Terraform vs CLI)

---

## 10. Ejercicios de refuerzo

### 10.1. Ejercicio de identificación

Explica la diferencia entre:
- `aws_s3_bucket` vs `aws_s3_bucket_versioning`
- `list-objects-v2` vs `list-object-versions`
- Delete marker vs versión de objeto
- Eliminación lógica vs eliminación permanente

### 10.2. Ejercicio de interpretación

Un bucket versionado tiene 3 versiones de `doc.txt` (v1, v2, v3).
Ejecutas: `aws s3api delete-object --bucket b --key doc.txt`
Luego: `aws s3api delete-object --bucket b --key doc.txt --version-id <delete-marker-id>`
¿Cuántas versiones quedan? ¿Cuál es la actual?
Verifica en LocalStack.

### 10.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera un script Bash que, dado un bucket versionado y una clave:
1. Liste todas las versiones con VersionId e IsLatest
2. Permita al usuario elegir una versión para recuperar
3. Descargue esa versión a un archivo local
Usa aws_local, jq, read. Maneja errores.
```

---

## 11. Limitaciones de LocalStack en S3 versionado

| Característica | LocalStack | AWS Real |
|----------------|------------|----------|
| Versionado básico | ✅ | ✅ |
| Delete markers | ✅ | ✅ |
| Recuperar versión | ✅ | ✅ |
| Eliminación permanente | ✅ | ✅ |
| Políticas de ciclo de vida (lifecycle) | ⚠️ Parcial | ✅ |
| Replicación cross-region | ❌ | ✅ |
| Object Lock / Legal Hold | ❌ | ✅ |
| Access Points | ❌ | ✅ |
| CORS completo | ⚠️ Parcial | ✅ |

---

## 12. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `list-object-versions` vacío | Versionado no habilitado | Asumir versionado por defecto |
| `NoSuchVersion` al recuperar | VersionId incorrecto | Usar `list-object-versions` para obtener IDs |
| Objeto "desaparece" tras delete | Delete marker creado | Verificar con `list-object-versions` |
| `terraform destroy` falla | Bucket no vacío (versiones) | Vaciar versiones ANTES o usar `force_destroy` |
| Versiones no se borran | Delete markers no eliminados | Eliminar delete markers también |

---

## 13. Evaluación y cierre

### 13.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Bucket + versionado | No creado | Creado sin versionado | Creado + versionado habilitado |
| Objetos gestionados | No creados | Creados sin versiones | Creados + versiones verificadas |
| Recuperación | No intenta | Recupera sin version-id | Recupera versión específica |
| Delete markers | No entiende | Identifica | Elimina y restaura correctamente |
| Limpieza | No limpia | Parcial | Completa (versiones + markers + bucket) |

### 13.2. Checklist final

- [ ] Bucket creado con Terraform
- [ ] Versionado habilitado via `aws_s3_bucket_versioning`
- [ ] Dos objetos con misma clave (v1, v2) gestionados por Terraform
- [ ] Versiones listadas con `aws_local list-object-versions`
- [ ] Versión anterior recuperada usando `--version-id`
- [ ] Delete marker creado y verificado
- [ ] Delete marker eliminado → objeto restaurado
- [ ] Versión específica eliminada permanentemente
- [ ] Objeto experimental CLI creado y limpiado (versiones + markers)
- [ ] `terraform destroy` ejecutado
- [ ] `aws_local list-buckets` vacío
- [ ] `docker compose down`

### 13.3. Idea principal

> **Versionado = historial de cambios en S3.**
> Terraform gestiona el bucket y la configuración de versionado.
> `aws_local` revela la realidad completa: versiones, delete markers, recuperación.
> **Eliminar no es borrar: es marcar. Borrar de verdad requiere VersionId.**
