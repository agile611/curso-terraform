# Limpieza de recursos y reinicio del laboratorio con Terraform y LocalStack

> **Curso de Terraform para AWS.**
>
> Todos los despliegues de esta página utilizan LocalStack.
>
> Utiliza únicamente credenciales ficticias y endpoints locales.
>
> No necesitas una cuenta real de AWS.
>
> Una ejecución satisfactoria en LocalStack no equivale a una validación completa en AWS.

Limpiar un laboratorio no consiste únicamente en detener un contenedor.
También implica eliminar los recursos gestionados, comprobar los objetos externos y conservar un estado coherente.
El reinicio debe permitir repetir la práctica sin confundir recursos antiguos con recursos nuevos.

Esta lección distingue cuatro operaciones: destruir infraestructura, detener servicios, retirar contenedores y restablecer datos.
Cada operación tiene un alcance diferente.
Elegir la adecuada evita pérdida de información y errores en las siguientes sesiones.

Terraform gestionará los recursos declarativos.
AWS CLI (vía `aws_local`) ayudará a observar el servicio y eliminar un objeto externo de práctica.
Docker Compose gestionará el entorno de emulación.
La documentación incluirá comprobaciones antes y después de cada cambio relevante.

---

## 1. Objetivos de aprendizaje

### 1.1. Objetivos conceptuales

Al finalizar, podrás:

- Diferenciar destrucción de recursos y retirada del emulador.
- Explicar por qué el estado debe conservarse durante la limpieza.
- Reconocer el alcance de contenedores, redes y volúmenes.
- Distinguir reinicio operativo y restablecimiento de datos.
- Identificar riesgos en un entorno compartido.

### 1.2. Objetivos prácticos

También podrás:

- Revisar un plan de destrucción.
- Eliminar un objeto externo identificado.
- Comprobar la ausencia de recursos.
- Retirar únicamente el proyecto Compose del laboratorio.
- Volver a desplegar y verificar la práctica.

---

## 2. Alcance y exclusiones

### 2.1. Alcance principal

Trabajaremos con:

- Un bucket S3 gestionado por Terraform.
- Un objeto S3 gestionado por Terraform.
- Un objeto adicional creado mediante `aws_local`.
- Un servicio LocalStack gestionado mediante Compose.
- Estado local de Terraform.

### 2.2. Fuera del alcance principal

No utilizaremos:

- AWS real.
- Recursos de producción.
- Limpieza global de Docker.
- Eliminación indiscriminada de archivos.
- Backends remotos.
- Borrado masivo de versiones S3.

### 2.3. Ampliaciones

El versionado, los volúmenes y la recuperación de estado se estudiarán con condiciones específicas.

---

## 3. Requisitos previos

### 3.1. Comandos de identificación

```bash
terraform version
docker version
docker compose version
aws --version
jq --version
```

### 3.2. Interpretación

Docker debe mostrar un servidor disponible.
AWS CLI debe corresponder a la versión 2.
`jq` se utilizará para comprobar coincidencias exactas en JSON.
Los comandos de terminal utilizan Bash.

### 3.3. Conocimientos necesarios

Debes comprender el ciclo básico de Terraform.
También debes reconocer el directorio del proyecto y el endpoint local.
Resuelve errores de instalación antes de continuar.

---

## 4. Versiones y reproducibilidad

### 4.1. Base didáctica

La configuración permitirá Terraform desde 1.6 y anterior a 2.0.
El provider de AWS se limitará a la serie 5.
LocalStack utilizará una referencia concreta proporcionada por el docente (ej. 3.7.0).
Estas restricciones no representan una lista de versiones más recientes.

### 4.2. Registro mínimo

Conserva:

- Terraform CLI.
- Provider seleccionado.
- Docker y Docker Compose.
- AWS CLI y `jq`.
- Imagen y modalidad de LocalStack.
- Sistema y arquitectura.

### 4.3. Condición docente

La combinación debe probarse antes de impartir la sesión.
Esta página no afirma haber ejecutado los comandos en tu equipo.

---

## 5. Vocabulario de limpieza

Las palabras utilizadas deben indicar el alcance de la operación.

### 5.1. Destrucción de infraestructura

Terraform elimina recursos vinculados a la configuración y al estado.
La operación se realiza mediante el provider.
El emulador debe estar disponible para atender las solicitudes.

### 5.2. Detención

Docker Compose detiene los contenedores (`docker compose stop`).
Los contenedores, redes y volúmenes se conservan.
Un `docker compose start` posterior recupera el estado del contenedor.

### 5.3. Retirada

Docker Compose elimina contenedores, redes y (opcionalmente) volúmenes (`docker compose down [-v]`).
Los volúmenes nombrados persisten salvo `-v`.
El estado de Terraform **no** se toca.

### 5.4. Restablecimiento de datos

Eliminar el volumen de datos de LocalStack (`docker compose down -v` + `docker volume rm`).
El siguiente arranque será un entorno vacío.
El estado de Terraform seguirá existiendo → **drift garantizado**.

---

## 6. Configuración del laboratorio

### 6.1. Arquitectura

```
Terraform (estado local)          aws_local (observación)
     │                                  │
     ▼                                  ▼
http://127.0.0.1:4566 (LocalStack S3)
     │
     ├── docker compose stop      (detiene, conserva)
     ├── docker compose down      (retira contenedores/red)
     └── docker compose down -v   (retira + volúmenes)
```

### 6.2. `compose.yaml`

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

### 6.3. `aws_local`

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

### 6.4. Recursos Terraform

```hcl
# main.tf
resource "aws_s3_bucket" "lab" {
  bucket = "tf-aula-limpieza-001"
  force_destroy = false
  tags = { Leccion = "Limpieza" }
}

resource "aws_s3_object" "gestionado" {
  bucket = aws_s3_bucket.lab.bucket
  key    = "terraform/archivo.txt"
  content = "Gestionado por Terraform"
}

# Objeto externo (CLI) - se crea en práctica
# aws_local s3api put-object --bucket tf-aula-limpieza-001 --key externo/archivo.txt --body externo.txt
```

---

## 7. Práctica guiada paso a paso

### Paso 1: Preparar y desplegar

```bash
mkdir -p limpieza/evidencias
cd limpieza

docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .
source .env.localstack

terraform init
terraform fmt
terraform validate
terraform plan -out=deploy.tfplan
terraform apply deploy.tfplan
```

### Paso 2: Crear objeto externo (CLI)

```bash
echo "Objeto externo CLI" > externo.txt
aws_local s3api put-object \
  --bucket tf-aula-limpieza-001 \
  --key externo/archivo.txt \
  --body externo.txt

aws_local s3api list-objects-v2 --bucket tf-aula-limpieza-001
```

### Paso 3: Verificar estado inicial

```bash
# Terraform
terraform state list
terraform output

# API
aws_local s3api list-buckets
aws_local s3api list-objects-v2 --bucket tf-aula-limpieza-001
```

### Paso 4: Limpiar objeto externo (CLI) ANTES de destroy

```bash
# IMPORTANTE: Terraform no gestiona este objeto
aws_local s3api delete-object \
  --bucket tf-aula-limpieza-001 \
  --key externo/archivo.txt

aws_local s3api list-objects-v2 --bucket tf-aula-limpieza-001
# Solo debe quedar terraform/archivo.txt
```

### Paso 5: Plan de destrucción

```bash
terraform plan -destroy -out=destroy.tfplan
terraform show destroy.tfplan
# Verificar: - aws_s3_object.gestionado, - aws_s3_bucket.lab
```

### Paso 6: Aplicar destrucción

```bash
terraform apply destroy.tfplan
```

### Paso 7: Verificar limpieza de recursos

```bash
# Estado Terraform
terraform state list  # Debe estar vacío

# API LocalStack
aws_local s3api list-buckets  # Debe estar vacío
aws_local s3api list-objects-v2 --bucket tf-aula-limpieza-001 2>&1 | head -5
# Debe dar error NoSuchBucket
```

### Paso 8: Detener vs Retirar vs Restablecer

#### 8.1. Detener (conserva todo)

```bash
docker compose stop
docker compose ps  # Estado: Exited
# Volumen localstack_data conserva datos
```

#### 8.2. Retirar (elimina contenedores/red, conserva volumen)

```bash
docker compose down
docker compose ps  # Nada
docker volume ls | grep localstack_data  # Volumen existe
```

#### 8.3. Restablecer (elimina todo, incluyendo volumen)

```bash
docker compose down -v
docker volume ls | grep localstack_data  # Volumen NO existe
```

### Paso 9: Reinicio operativo (tras stop/down SIN -v)

```bash
# Si hiciste solo stop o down (sin -v)
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .

# Verificar: ¿datos persisten?
aws_local s3api list-buckets
# Si bucket existía en volumen → aparece (pero estado Terraform vacío = drift)
```

### Paso 10: Reinicio limpio (tras down -v)

```bash
# Si hiciste down -v
docker compose up -d
curl -s http://127.0.0.1:4566/_localstack/health | jq .

aws_local s3api list-buckets  # Vacío
# Entorno limpio, listo para nuevo terraform init + apply
```

### Paso 11: Drift por restablecimiento incorrecto

```bash
# Escenario: down -v (datos perdidos) pero estado Terraform conservado
terraform plan
# Mostrará: + aws_s3_bucket.lab (porque API vacía pero estado tiene recurso)
# Esto es DRIFT: estado ≠ realidad
```

---

## 8. Sesiones guiadas para el alumnado

### 8.1. Sesión 1: Limpieza ordenada (30 min)

1. Desplegar bucket + 2 objetos (Terraform + CLI)
2. Eliminar objeto CLI → verificar
3. `plan -destroy` → revisar → `apply`
4. Verificar: `state list` vacío + `list-buckets` vacío
4. **Entrega**: Registro paso a paso + evidencias de cada verificación

### 8.2. Sesión 2: Detener vs Retirar vs Restablecer (25 min)

1. `docker compose stop` → `ps` → `up -d` → verificar persistencia
2. `docker compose down` → `ps` → `volume ls` → `up -d` → verificar
3. `docker compose down -v` → `volume ls` → `up -d` → verificar vacío
4. **Entrega**: Tabla comparativa de 3 operaciones + qué persiste en cada caso

### 8.3. Sesión 3: Drift y reinicio (20 min)

1. Desplegar → `down -v` → `up -d` → `terraform plan` (drift)
2. Analizar: ¿por qué drift? ¿qué hacer?
3. Opción A: `terraform apply` (recrea en LocalStack vacío)
4. Opción B: `terraform state rm` + `import` (avanzado, módulo 07)
5. Limpiar todo
6. **Entrega**: Evidencia drift + decisión documentada

---

## 9. Ejercicios de refuerzo

### 9.1. Ejercicio de identificación

Explica la diferencia entre:
- `docker compose stop` vs `down` vs `down -v`
- `terraform destroy` vs `docker compose down`
- Objeto en estado vs objeto solo en API

### 9.2. Ejercicio de diagnóstico

Un alumno hace:
1. `terraform apply` (crea bucket)
2. `docker compose down -v`
3. `docker compose up -d`
4. `terraform plan` → muestra creación de bucket

¿Por qué? ¿Qué debería hacer antes de `apply`?

### 9.3. Ejercicio con asistente de IA

```text
Instrucción:
Genera una checklist de limpieza para un laboratorio Terraform + LocalStack.
Incluye: orden de operaciones, verificaciones entre pasos, qué comando para cada nivel.
Distingue: objetos CLI, recursos Terraform, contenedores, volúmenes, estado.
```

---

## 10. Limitaciones de LocalStack en limpieza

| Aspecto | LocalStack | AWS Real |
|---------|------------|----------|
| `force_destroy` bucket | ✅ Funciona | ✅ Funciona |
| Versionado + destroy | ⚠️ Requiere vaciar versiones | ✅ Requiere vaciar versiones |
| `down -v` elimina datos | ✅ Inmediato | N/A (datos en servicio gestionado) |
| Reinicio rápido | Segundos | Minutos (crear cuenta, recursos) |
| Drift tras restablecimiento | Común | Raro (infraestructura persistente) |

---

## 11. Diagnóstico de errores frecuentes

| Síntoma | Qué comprobar | Qué evitar |
|---------|---------------|------------|
| `BucketNotEmpty` al destroy | Objetos/versiones no eliminados | Poner `force_destroy=true` sin vaciar |
| Drift tras reinicio | `down -v` usado pero estado conservado | Ignorar plan, aplicar ciegamente |
| Recursos "fantasma" en API | Estado vacío pero `list-buckets` muestra bucket | Asumir que destroy falló sin verificar |
| `terraform destroy` falla | LocalStack no corriendo | Borrar estado para "arreglar" |
| Volumen no se elimina | `docker volume rm` manual necesario | `down -v` sin verificar `volume ls` |

---

## 12. Evaluación y cierre

### 12.1. Rúbrica (0-2 puntos)

| Criterio | 0 pts | 1 pt | 2 pts |
|----------|-------|------|-------|
| Destrucción | No destruye | Destruye sin plan | `plan -destroy` → revisar → `apply` |
| Objetos CLI | No limpia | Limpia después de destroy | Limpia ANTES de destroy (correcto) |
| Verificación | Sin comprobar | Solo `state list` | `state list` + `list-buckets` + `list-objects` |
| Operaciones Docker | Confunde stop/down/down-v | Usa uno sin saber diferencia | Elige correcto + explica qué persiste |
| Drift | No identifica | Identifica sin resolver | Identifica + explica causa + decide acción |

### 12.2. Checklist final

- [ ] Objeto CLI eliminado ANTES de `terraform destroy`
- [ ] `terraform plan -destroy` revisado
- [ ] `terraform apply destroy.tfplan` ejecutado
- [ ] `terraform state list` vacío
- [ ] `aws_local s3api list-buckets` vacío
- [ ] `aws_local s3api list-objects-v2` error NoSuchBucket
- [ ] Operación Docker elegida correctamente (stop/down/down-v)
- [ ] Si `down -v`: siguiente `terraform plan` muestra recreación (drift esperado)
- [ ] Documentación de qué operación se usó y por qué

### 12.3. Idea principal

> **Destruir ≠ Detener ≠ Retirar ≠ Restablecer.**
> Cada operación tiene su alcance. Elige la correcta.
> **Limpia en orden: objetos CLI → recursos Terraform → contenedores → volúmenes (si procede).**
> **El estado de Terraform es la fuente de verdad de lo que GESTIONAS, no de lo que EXISTE.**
