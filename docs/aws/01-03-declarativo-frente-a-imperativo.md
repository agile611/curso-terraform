# Declarativo frente a imperativo: comprender y practicar con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Esta lección explica dos formas de expresar una tarea técnica: indicar acciones o describir resultados.
El enfoque imperativo se centra en los pasos que deben ejecutarse.
El enfoque declarativo se centra en el estado que se desea alcanzar.
Ambos pueden ser útiles, pero plantean preguntas distintas sobre repetición, cambios y recuperación.

Trabajaremos con dos buckets S3 locales.
Uno se gestionará mediante comandos de AWS CLI (vía `aws_local`).
El otro se gestionará mediante una configuración de Terraform.
La comparación permitirá observar diferencias sin mezclar la propiedad de los recursos.

El objetivo no es demostrar que una herramienta siempre supera a otra.
El objetivo es elegir procedimientos comprensibles, verificables y adecuados para cada tarea.
Cada práctica incluirá una intención, una observación y una interpretación.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Definir el enfoque imperativo.
- Definir el enfoque declarativo.
- Diferenciar una instrucción de un estado deseado.
- Explicar qué significa converger.
- Reconocer el papel del estado de Terraform.
- Distinguir idempotencia, repetibilidad y reproducibilidad.

### 1.2. Objetivos prácticos

También podrás:

- Crear un recurso mediante comandos (`aws_local`).
- Crear otro recurso mediante Terraform.
- Comparar una segunda ejecución.
- Revisar un cambio antes de aplicarlo.
- Detectar una modificación externa (drift).
- Limpiar cada recurso con su procedimiento correspondiente.

### 1.3. Evidencia final

Entregarás código, comandos y observaciones.
La evidencia debe mostrar qué ocurrió realmente.
No basta con afirmar que un procedimiento es mejor.

---

## 2. Alcance de la lección

### 2.1. Recursos utilizados

El laboratorio incluye:

- Un bucket llamado `aula-imperativo-001` (gestionado con `aws_local`).
- Un bucket llamado `aula-declarativo-001` (gestionado con Terraform).
- Etiquetas de clasificación.
- Consultas de verificación.
- Un objeto ficticio opcional.

### 2.2. Componentes del entorno

Utilizaremos:

- Terraform CLI.
- El provider de AWS.
- AWS CLI (vía `aws_local`).
- Docker Compose.
- LocalStack.
- Una terminal Bash.

### 2.3. Restricciones

No se utilizarán recursos de AWS real.
No se configurarán políticas IAM.
No se implementará un backend remoto.
No se introducirán secretos.
No se gestionará el mismo bucket con dos procedimientos simultáneos.

---

## 3. Requisitos previos

### 3.1. Conocimientos recomendados

Debes saber:

- Crear directorios.
- Editar archivos.
- Ejecutar comandos.
- Leer mensajes de error.
- Identificar un endpoint.
- Diferenciar un archivo de un servicio.

### 3.2. Herramientas necesarias

Prepara:

- Terraform compatible con la configuración (>= 1.6, < 2.0).
- Docker en funcionamiento.
- Docker Compose.
- AWS CLI v2.
- Un editor de texto.
- Bash.

### 3.3. Sistemas operativos

Los ejemplos de terminal utilizan Bash.
En Windows puedes emplear WSL.
No pegues funciones Bash directamente en PowerShell.
Adapta rutas únicamente después de comprender su función.

---

## 4. Versiones y compatibilidad

### 4.1. Base didáctica

La configuración utilizará:

- Terraform desde 1.6 y anterior a 2.0.
- Provider de AWS dentro de la serie 5.
- Una etiqueta concreta de LocalStack (ej. 3.7.0).

Estas elecciones son una referencia del ejemplo.
No se presentan como las versiones más recientes.
Tampoco se afirma que esta página haya ejecutado y validado la combinación.

### 4.2. Comprobación inicial

```bash
terraform version
docker version
docker compose version
aws --version
```

---

## 5. Configuración del laboratorio (Ubuntu 24.04 + Docker + LocalStack)

### 5.1. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Equipo Anfitrión (Ubuntu 24.04)         │
│  ┌──────────────┐  ┌──────────────────┐                    │
│  │   Terraform  │  │   aws_local()    │                    │
│  │   (declarativo)│  │  (imperativo)    │                    │
│  └──────┬───────┘  └────────┬─────────┘                    │
│         │                   │                              │
│         └───────────────────┼──────────────────────────────┘
│                             ▼                              │
│                  http://localhost:4566                     │
│                             │                              │
│                             ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Docker Container: LocalStack             │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐    │  │
│  │  │  Bucket: declarativo │  │  Bucket: imperativo  │    │  │
│  │  └─────────────────────┘  └─────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2. Archivo `compose.yaml`

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

### 5.3. Función `aws_local`

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
```

### 5.4. Provider Terraform

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
  endpoints { s3 = "http://localhost:4566" }
}
```

---

## 6. Diferencias clave: Enfoque imperativo vs declarativo

| Aspecto | Imperativo (`aws_local`) | Declarativo (Terraform) |
|---------|--------------------------|-------------------------|
| **Qué describes** | Pasos/acciones a ejecutar | Estado final deseado |
| **Orden** | Explícito en el script | Calculado por Terraform |
| **Repetición** | Re-ejecutar script completo | `terraform apply` (idempotente) |
| **Cambios** | Manual: editar script | Automático: `plan` → `apply` |
| **Estado** | No hay estado persistente | Estado (`terraform.tfstate`) |
| **Drift** | Difícil de detectar | `terraform plan` lo detecta |
| **Verificación** | Consultar tras cada paso | `output` + `aws_local` independiente |
| **Limpieza** | Comandos `delete` manuales | `terraform destroy` |

---

## 7. Práctica guiada paso a paso

### Paso 1: Preparar directorio

```bash
mkdir -p declarativo-vs-imperativo/evidencias
cd declarativo-vs-imperativo
```

### Paso 2: Crear `compose.yaml` y arrancar LocalStack

```bash
# (usar compose.yaml de la sección 5.2)
docker compose up -d
docker compose ps
curl -s http://localhost:4566/_localstack/health | jq .
```

### Paso 3: Enfoque imperativo - Crear bucket con `aws_local`

```bash
# Definir aws_local
source ../.env.localstack  # o definir la función aquí

# Crear bucket
aws_local s3api create-bucket --bucket aula-imperativo-001

# Verificar
aws_local s3api list-buckets
aws_local s3api head-bucket --bucket aula-imperativo-001

# Añadir etiquetas (imperativo: comando explícito)
aws_local s3api put-bucket-tagging \
  --bucket aula-imperativo-001 \
  --tagging 'TagSet=[{Key=Entorno,Value=LocalStack},{Key=Metodo,Value=Imperativo}]'

# Verificar etiquetas
aws_local s3api get-bucket-tagging --bucket aula-imperativo-001
```

### Paso 4: Enfoque declarativo - Crear bucket con Terraform

```hcl
# main.tf
resource "aws_s3_bucket" "declarativo" {
  bucket = "aula-declarativo-001"
  tags = {
    Entorno = "LocalStack"
    Metodo  = "Declarativo"
  }
}

output "bucket_name" { value = aws_s3_bucket.declarativo.bucket }
```

```bash
terraform init
terraform fmt
terraform validate
terraform plan -out=creacion.tfplan
terraform show creacion.tfplan
terraform apply creacion.tfplan
```

### Paso 5: Verificar ambos buckets

```bash
# Desde Terraform
terraform output
terraform state list

# Desde aws_local (verificación independiente)
aws_local s3api list-buckets
aws_local s3api get-bucket-tagging --bucket aula-declarativo-001
```

### Paso 6: Segunda ejecución - Comparar comportamiento

```bash
# Imperativo: re-ejecutar create-bucket falla (ya existe)
aws_local s3api create-bucket --bucket aula-imperativo-001
# Error: BucketAlreadyExists

# Declarativo: terraform plan no propone cambios
terraform plan
# No changes. Infrastructure is up-to-date.
```

### Paso 7: Modificar etiquetas - Comparar

```bash
# Imperativo: comando explícito de actualización
aws_local s3api put-bucket-tagging \
  --bucket aula-imperativo-001 \
  --tagging 'TagSet=[{Key=Entorno,Value=LocalStack},{Key=Metodo,Value=Imperativo},{Key=Actualizado,Value=true}]'

# Declarativo: modificar configuración y aplicar
# En main.tf, añadir al mapa tags: Actualizado = "true"
terraform fmt
terraform validate
terraform plan -out=update.tfplan
terraform show update.tfplan
terraform apply update.tfplan
```

### Paso 8: Detectar drift (cambio externo)

```bash
# Modificar bucket declarativo desde fuera (aws_local)
aws_local s3api put-bucket-tagging \
  --bucket aula-declarativo-001 \
  --tagging 'TagSet=[{Key=Entorno,Value=ModificadoExterno}]'

# Terraform detecta el drift
terraform plan
# Muestra: tags serán actualizadas a valor de configuración
```

### Paso 9: Limpieza

```bash
# Imperativo
aws_local s3api delete-bucket --bucket aula-imperativo-001

# Declarativo
terraform plan -destroy -out=destroy.tfplan
terraform apply destroy.tfplan

# Verificar
aws_local s3api list-buckets

# Detener LocalStack
docker compose down
```

---

## 8. Sesiones guiadas para el alumnado

### 8.1. Sesión 1: Imperativo (25 min)

1. Arrancar LocalStack, definir `aws_local`
2. Crear bucket `aula-imperativo-001` con `aws_local`
3. Añadir etiquetas con `put-bucket-tagging`
4. Verificar con `list-buckets` y `get-bucket-tagging`
5. Intentar crear de nuevo → observar error
6. **Entrega**: Capturas de comandos + explicación de qué pasó en re-ejecución

### 8.2. Sesión 2: Declarativo (30 min)

1. Escribir `main.tf` con bucket `aula-declarativo-001`
2. `init`, `fmt`, `validate`, `plan`, `apply`
3. Verificar con `terraform output` y `aws_local`
4. Ejecutar `terraform plan` de nuevo → sin cambios
5. **Entrega**: Plan inicial + plan segunda ejecución + explicación convergencia

### 8.3. Sesión 3: Comparación y drift (25 min)

1. Modificar etiquetas en ambos enfoques
2. Comparar: comando explícito vs modificar HCL + plan + apply
3. Introducir drift en bucket declarativo con `aws_local`
4. Ejecutar `terraform plan` → detecta drift
5. Limpiar ambos buckets
6. **Entrega**: Tabla comparativa + evidencia drift + limpieza

---

## 9. Ejercicios de refuerzo

### 9.1. Ejercicio de identificación

Explica la función de:
- `terraform plan` vs `aws_local s3api put-bucket-tagging`
- Estado de Terraform (`terraform.tfstate`) vs sin estado en CLI
- Convergencia en Terraform vs idempotencia en CLI

### 9.2. Ejercicio de interpretación

Compara: ¿Qué pasa si cambias el nombre del bucket en cada enfoque?
- Imperativo: `create-bucket` con nuevo nombre + `delete-bucket` antiguo
- Declarativo: `terraform plan` muestra reemplazo (`-/+`)
Genera planes, no apliques. Documenta la diferencia.

### 9.3. Ejercicio con asistente de IA

```text
Instrucción:
Compara ambos enfoques para un estudiante que nunca ha usado Terraform.
Usa como ejemplo la creación y modificación de etiquetas de un bucket S3.
No ejecutes comandos. No inventes salidas.
Indica qué enfoque permite detectar cambios externos automáticamente.
```

Verifica la explicación contra la práctica real.

---

## 10. Limitaciones de `aws_local` / LocalStack en esta lección

| Operación | LocalStack | AWS Real |
|-----------|------------|----------|
| `create-bucket` | ✅ Funciona | ✅ Funciona |
| `put-bucket-tagging` | ✅ Funciona | ✅ Funciona |
| `get-bucket-tagging` | ✅ Funciona | ✅ Funciona |
| Versionado buckets | ⚠️ Parcial | ✅ Completo |
| Políticas de bucket complejas | ⚠️ Limitado | ✅ Completo |
| Replicación cross-region | ❌ No | ✅ Sí |

> ⚠️ **Nota**: En AWS real, el enfoque imperativo con AWS CLI requiere credenciales reales, perfiles IAM, y los comandos `create-bucket` pueden fallar por nombres globales únicos. Terraform en AWS real usa el mismo flujo declarativo pero con provider configurado para endpoints reales.

---

## 11. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| BucketAlreadyExists | Nombre único global en AWS real | Usar nombres aleatorios |
| AccessDenied | Credenciales, políticas IAM | Ignorar permisos en LocalStack |
| Drift no detectado | Atributos no gestionados en config | Asumir que Terraform lo ve todo |
| Plan muestra cambios inesperados | Revisar `ignore_changes`, `lifecycle` | Aplicar sin leer plan |

---

## 12. Evaluación y cierre

### 12.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Configuración | No operativa | Requiere ajustes | Cumple laboratorio |
| Interpretación | No explica diferencias | Explicación parcial | Explicación fundamentada |
| Verificación | Sin evidencias | Evidencias incompletas | Comprobaciones independientes |
| Comparación | No compara | Compara superficial | Compara con evidencias |
| Documentación | No reproducible | Faltan detalles | Permite repetir práctica |

### 12.2. Checklist final

- [ ] Creé ambos buckets (imperativo y declarativo)
- [ ] Verifiqué con `aws_local` independientemente
- [ ] Comprobé convergencia en Terraform (plan sin cambios)
- [ ] Detecté drift modificando externamente
- [ ] Limpié ambos buckets antes de detener LocalStack
- [ ] Documenté diferencias clave en tabla comparativa

### 12.3. Idea principal

> **Imperativo = "cómo hacerlo"; Declarativo = "qué se quiere".**
> Terraform gestiona estado y convergencia; CLI requiere lógica manual.
> **Verifica siempre con herramienta independiente (`aws_local`).**
