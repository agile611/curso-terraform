# Configuración de AWS CLI y aws_local para trabajar con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

AWS CLI permite enviar solicitudes a las APIs de servicios.
`aws_local` simplifica esas solicitudes cuando el destino es LocalStack.
Terraform utiliza su propio provider, pero puede apoyarse en estas herramientas para verificar resultados.

Esta lección explica cómo preparar clientes, configurar un perfil local y comprobar sus destinos.
También incluye ejercicios de consulta, creación, descarga y limpieza de recursos S3.
El objetivo es distinguir lo solicitado, lo ejecutado y lo verificado.

Los comandos principales utilizan Bash.
AWS CLI, `aws_local` y Terraform se ejecutan en el equipo anfitrión (Ubuntu 24.04).
LocalStack se ejecuta dentro de Docker.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Explicar la función de AWS CLI.
- Explicar la función de `aws_local`.
- Diferenciar credenciales, región, perfil y endpoint.
- Reconocer cuándo una configuración puede heredarse del entorno.
- Distinguir clientes de consulta y herramientas de gestión declarativa.

### 1.2. Objetivos prácticos

También podrás:

- Configurar un perfil con credenciales ficticias.
- Ejecutar consultas contra LocalStack.
- Crear y comprobar recursos de práctica.
- Comparar AWS CLI y `aws_local`.
- Verificar recursos creados mediante Terraform.
- Limpiar el laboratorio con un alcance explícito.

---

## 2. Alcance de la lección

### 2.1. Herramientas utilizadas

Trabajaremos con:

- AWS CLI v2.
- `aws_local` (wrapper function).
- Docker Compose.
- LocalStack.
- Terraform.
- Python y pipx (opcional, para awslocal package).
- Bash, jq.

### 2.2. Recursos de práctica

Crearemos un bucket para operaciones de CLI.
Dentro de él utilizaremos un archivo ficticio.
Después crearemos otro bucket mediante Terraform.
Los nombres de ambos recursos serán diferentes.

### 2.3. Exclusiones

No configuraremos identidades reales de AWS.
No validaremos políticas IAM de producción.
No utilizaremos recursos de clientes ni información personal.
No importaremos recursos existentes al estado de Terraform.

---

## 3. Requisitos previos

### 3.1. Conocimientos necesarios

Debes saber:

- Abrir una terminal.
- Crear y editar archivos.
- Cambiar de directorio.
- Ejecutar Docker Compose.
- Identificar un puerto local.
- Interpretar errores básicos.

### 3.2. Herramientas necesarias

Prepara:

- Docker con su motor iniciado.
- Docker Compose.
- AWS CLI versión 2 para la ruta principal.
- Python compatible con pipx (opcional).
- Terraform compatible con la configuración (>= 1.6, < 2.0).
- Un editor de texto.

### 3.3. Condición docente

El docente debe probar la combinación de versiones antes de impartir la sesión.
Esta página no afirma haber ejecutado los comandos en tu equipo.

---

## 4. Arquitectura del laboratorio

Los clientes compartirán un servicio local, pero conservarán responsabilidades diferentes.

### 4.1. Recorrido de las solicitudes

```
Equipo anfitrión (Ubuntu 24.04)
├── AWS CLI ─────────────────────────┐
├── aws_local ── AWS CLI compatible ──┤
└── Terraform ── Provider AWS ────────┤
                                    ▼
                          http://127.0.0.1:4566
                                    ▼
                              LocalStack (Docker)
                                    ▼
                                S3 local
```

### 4.2. Separación importante

AWS CLI y `aws_local` permiten consultar y ejecutar operaciones.
Terraform mantiene relaciones de gestión mediante su estado.
Consultar un recurso no lo incorpora al estado.
Crear un objeto mediante CLI tampoco lo convierte automáticamente en un recurso Terraform.

---

## 5. Qué es AWS CLI

AWS CLI es un cliente para ejecutar operaciones de servicios desde una terminal.

### 5.1. Estructura de los comandos

La estructura general es:

```bash
aws <servicio> <operación> [--parámetros] [--opciones-globales]
```

Ejemplos:

```bash
aws s3api list-buckets
aws s3api create-bucket --bucket mi-bucket --region us-east-1
aws dynamodb list-tables --region us-east-1
```

### 5.2. Opciones globales comunes

| Opción | Descripción |
|--------|-------------|
| `--region` | Región objetivo |
| `--endpoint-url` | Endpoint personalizado (para LocalStack) |
| `--profile` | Perfil de credenciales |
| `--no-cli-pager` | Salida directa sin paginador |
| `--output` | Formato: json, text, table, yaml |

---

## 6. Qué es aws_local

`aws_local` es una función de Bash que invoca AWS CLI dirigiendo las peticiones a LocalStack.

### 6.1. Definición estándar

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

### 6.2. Qué hace cada opción

| Opción | Propósito |
|--------|-----------|
| `AWS_ACCESS_KEY_ID=test` / `AWS_SECRET_ACCESS_KEY=test` | Credenciales ficticias requeridas por el CLI |
| `AWS_SESSION_TOKEN=` | Anula tokens de sesión heredados |
| `AWS_CONFIG_FILE=/dev/null` | Ignora archivo de configuración local |
| `AWS_SHARED_CREDENTIALS_FILE=/dev/null` | Ignora archivo de credenciales local |
| `AWS_EC2_METADATA_DISABLED=true` | Evita consultas al metadata service de EC2 |
| `--endpoint-url http://127.0.0.1:4566` | Redirige la API a LocalStack |
| `--region us-east-1` | Región de referencia (coincide con compose.yaml) |
| `--no-cli-pager` | Salida directa sin paginador interactivo |

> **Nota**: No se establece `AWS_PROFILE` porque `AWS_CONFIG_FILE=/dev/null` ya ignora cualquier perfil configurado. Establecer `AWS_PROFILE=` (vacío) causa error en AWS CLI v2: "The config profile () could not be found".

### 6.3. Persistencia entre sesiones

```bash
# Crear archivo sourceable en el directorio del proyecto
cat > .env.localstack <<'EOF'
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
export -f aws_local
EOF

# Cargar en cada terminal nueva
source .env.localstack
```

> **Importante**: No guardes credenciales reales en `.env.localstack`. Este archivo es solo para el laboratorio local.

---

## 7. Alternativa: paquete awslocal (pipx)

Existe un paquete Python llamado `awslocal` que hace lo mismo.

### 7.1. Instalación

```bash
pipx install awscli-local
# o: pip install awscli-local
```

### 7.2. Uso

```bash
# Equivalente a aws_local s3api list-buckets
awslocal s3api list-buckets
```

### 7.3. Diferencias con la función Bash

| Aspecto | `aws_local` (function) | `awslocal` (package) |
|---------|------------------------|----------------------|
| Instalación | Ninguna (Bash) | Requiere Python/pipx |
| Personalización | Editar función | Variables de entorno |
| Velocidad | Inmediata | Inicio Python |
| Dependencias | Solo AWS CLI | Python + awscli-local |

**Recomendación del curso**: Usar la función Bash `aws_local` por simplicidad y cero dependencias extra.

---

## 8. Configuración de AWS CLI (perfil local opcional)

Aunque `aws_local` anula la configuración, es útil tener un perfil base limpio.

### 8.1. Configuración mínima

```bash
aws configure set cli_pager ""
aws configure set region us-east-1
# NO configures access_key/secret_key reales
```

### 8.2. Perfil dedicado para LocalStack (opcional)

```bash
aws configure set aws_access_key_id test --profile localstack
aws configure set aws_secret_access_key test --profile localstack
aws configure set region us-east-1 --profile localstack
aws configure set output json --profile localstack
```

Uso:

```bash
aws --profile localstack --endpoint-url http://127.0.0.1:4566 s3api list-buckets
```

> **Limitación**: El perfil no anula `AWS_CONFIG_FILE` ni `AWS_SHARED_CREDENTIALS_FILE` si están seteados en el entorno. `aws_local` es más robusto.

---

## 9. Práctica guiada paso a paso

### Paso 1: Preparar entorno

```bash
mkdir -p aws-cli-practice/evidencias
cd aws-cli-practice

# Arrancar LocalStack (usar compose.yaml estándar)
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .

# Definir aws_local
source ../.env.localstack  # o definir la función aquí
```

### Paso 2: Verificar S3 vacío

```bash
aws_local s3api list-buckets
# {"Buckets": [], "Owner": {...}}
```

### Paso 3: Crear bucket con aws_local (imperativo)

```bash
aws_local s3api create-bucket --bucket cli-bucket-001

# Verificar
aws_local s3api head-bucket --bucket cli-bucket-001
aws_local s3api list-buckets
```

### Paso 4: Subir objeto ficticio

```bash
echo "Contenido de prueba desde aws_local" > prueba.txt

aws_local s3api put-object \
  --bucket cli-bucket-001 \
  --key documentos/prueba.txt \
  --body prueba.txt
```

### Paso 5: Listar y descargar

```bash
# Listar objetos
aws_local s3api list-objects-v2 --bucket cli-bucket-001

# Descargar
aws_local s3api get-object \
  --bucket cli-bucket-001 \
  --key documentos/prueba.txt \
  prueba-descargada.txt

# Comparar
diff prueba.txt prueba-descargada.txt
```

### Paso 6: Añadir etiquetas

```bash
aws_local s3api put-bucket-tagging \
  --bucket cli-bucket-001 \
  --tagging 'TagSet=[{Key=Origen,Value=CLI},{Key=Leccion,Value=AWS_CLI}]'

aws_local s3api get-bucket-tagging --bucket cli-bucket-001
```

### Paso 7: Crear bucket con Terraform (declarativo)

```hcl
# main.tf
resource "aws_s3_bucket" "terraform_bucket" {
  bucket = "tf-bucket-001"
  tags = {
    Origen  = "Terraform"
    Leccion = "AWS_CLI"
  }
}

output "bucket_name" { value = aws_s3_bucket.terraform_bucket.bucket }
```

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=tf.tfplan
terraform apply tf.tfplan
```

### Paso 8: Verificar bucket Terraform con aws_local

```bash
aws_local s3api list-buckets
aws_local s3api head-bucket --bucket tf-bucket-001
aws_local s3api get-bucket-tagging --bucket tf-bucket-001
```

### Paso 9: Automatizar verificación con jq

```bash
# Verificar que ambos buckets existen
aws_local s3api list-buckets | jq -r '.Buckets[].Name'

# Verificar etiquetas del bucket CLI
aws_local s3api get-bucket-tagging --bucket cli-bucket-001 | \
  jq -r '.TagSet[] | "\(.Key)=\(.Value)"'

# Verificar etiquetas del bucket Terraform
aws_local s3api get-bucket-tagging --bucket tf-bucket-001 | \
  jq -r '.TagSet[] | "\(.Key)=\(.Value)"'
```

### Paso 10: Limpiar

```bash
# Bucket CLI
aws_local s3api delete-object --bucket cli-bucket-001 --key documentos/prueba.txt
aws_local s3api delete-bucket --bucket cli-bucket-001

# Bucket Terraform
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan

# Verificar limpieza total
aws_local s3api list-buckets

# Detener LocalStack
docker compose down
```

---

## 10. Sesiones guiadas para el alumnado

### 10.1. Sesión 1: AWS CLI y aws_local (20 min)

1. Arrancar LocalStack, health check
2. Definir `aws_local` y comparar con `aws --endpoint-url ...`
3. `list-buckets` vacío → crear bucket → verificar
4. Subir/descargar objeto → comparar con `diff`
5. **Entrega**: Evidencias de cada paso + explicación de qué hace `aws_local`

### 10.2. Sesión 2: Terraform + verificación CLI (30 min)

1. Escribir `main.tf` para bucket Terraform
2. Ciclo completo: `init` → `plan` → `apply`
3. Verificar con `aws_local` (independiente)
4. Comparar etiquetas de ambos buckets con `jq`
5. **Entrega**: Plan Terraform + verificación `aws_local` + tabla comparativa

### 10.3. Sesión 3: Limpieza y separación responsabilidades (15 min)

1. Limpiar bucket CLI con comandos `delete-object`, `delete-bucket`
2. Limpiar bucket Terraform con `destroy`
3. Verificar `list-buckets` vacío
4. `docker compose down`
5. **Entrega**: Registro de limpieza distinguida (CLI vs Terraform)

---

## 11. Ejercicios de refuerzo

### 11.1. Ejercicio de identificación

Explica la función de:
- `AWS_CONFIG_FILE=/dev/null` en `aws_local`
- `--no-cli-pager`
- `aws_local` vs `awslocal` (package)
- Verificación independiente vs salidas de Terraform

### 11.2. Ejercicio de interpretación

Compara:
- Crear bucket con `aws_local create-bucket` vs Terraform `apply`
- Modificar etiquetas: `put-bucket-tagging` vs modificar HCL + `apply`
- Eliminar: `delete-bucket` vs `terraform destroy`

Genera tabla con: comando, quién gestiona estado, idempotencia, verificación.

### 11.3. Ejercicio con asistente de IA

```text
Instrucción:
Explica a un estudiante por qué usamos aws_local para verificar recursos Terraform.
Incluye: separación de responsabilidades, estado vs API, verificación independiente.
No ejecutes comandos. Usa ejemplos de esta lección.
```

---

## 12. Diferencias: aws_local / LocalStack vs AWS Real

| Aspecto | aws_local + LocalStack | AWS Real (AWS CLI) |
|---------|------------------------|-------------------|
| Credenciales | `test`/`test` (ficticias) | IAM reales (Access Key, Secret, Session Token) |
| Endpoint | `http://127.0.0.1:4566` | Regional (ej. `s3.us-east-1.amazonaws.com`) |
| Región | `us-east-1` (referencia) | Real, afecta disponibilidad/latencia |
| Perfil | Ignorado (`/dev/null`) | `--profile` o `AWS_PROFILE` funcional |
| Costes | Recursos locales | Facturación por requests/almacenamiento |
| Límites | Host (RAM, disco, CPU) | Cuotas AWS (soft/hard limits) |
| IAM | Simplificado | Completo (policies, conditions, boundaries) |
| Validación nombres | Básica | Estricta (global unique para S3) |

### 12.1. Cómo se haría en AWS Real

```bash
# Configurar credenciales reales (UNA VEZ)
aws configure
# O usar variables de entorno / perfil IAM role

# Usar AWS CLI directamente (SIN --endpoint-url)
aws s3api list-buckets --region us-east-1
aws s3api create-bucket --bucket mi-bucket-unico-global --region us-east-1

# Terraform en AWS real
provider "aws" {
  region = "us-east-1"
  # Credenciales via ~/.aws/credentials, env vars, o IAM role
  # NO endpoints locales
  # NO skip_* validations
}
```

---

## 13. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `aws: command not found` | AWS CLI v2 instalado, PATH | Usar v1 (deprecated) |
| `Invalid endpoint` | LocalStack corriendo, puerto 4566 | Cambiar endpoint sin verificar |
| `AccessDenied` | Credenciales `test`/`test`, skip_* en provider | Usar credenciales reales en LocalStack |
| `BucketAlreadyExists` | Nombre único (en AWS real) | Reusar nombres sin verificar |
| `NoSuchBucket` | Nombre correcto, bucket existe | Asumir que existe sin `head-bucket` |
| `aws_local` no encontrada | Función definida en shell actual | Definir en `.bashrc` sin `export -f` |

---

## 14. Evaluación y cierre

### 14.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| aws_local | No definida | Definida pero no usada | Definida + usada + persistida |
| Verificación CLI | Sin comandos | Comandos básicos | Comandos + jq + automatización |
| Terraform + CLI | No integra | Integra pero no verifica | Ciclo completo + verificación cruzada |
| Limpieza | No limpia | Limpia parcial | Limpia distinguida (CLI vs TF) |
| Documentación | No registra | Registra parcial | Registra todo + diferencias |

### 14.2. Checklist final

- [ ] `aws_local` definida y funcional
- [ ] Bucket CLI creado, verificado, limpiado
- [ ] Bucket Terraform creado, verificado con `aws_local`, destruido
- [ ] Verificación independiente con `aws_local` en ambos casos
- [ ] Automatización con `jq` para validar etiquetas
- [ ] `list-buckets` vacío al final
- [ ] LocalStack detenido

### 14.3. Idea principal

> **Terraform gestiona; aws_local verifica.**
> Separar gestión declarativa de consulta imperativa da confianza.
> **Siempre verifica con herramienta independiente del estado.**
