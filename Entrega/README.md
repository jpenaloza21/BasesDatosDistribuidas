# Práctica: Base de Datos Distribuidas con ReplicaSet en MongoDB

## 1. Pasos para levantar el entorno y cargar datos

### 1.1 **Bajar contenedores y limpiar volúmenes anteriores (si existen):**
docker compose down -v


### 1.2 Levantar el replicaset con Docker Compose:
docker compose up -d

### 1.3 Inicializar el replicaset desde el contenedor primario (mongo1):

docker exec -it mongo1 mongosh --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongo1:27017' },
    { _id: 1, host: 'mongo2:27017' },
    { _id: 2, host: 'mongo3:27017' }
  ]
})"

### 1.4 Verificar estado del replicaset:
docker exec -it mongo1 mongosh --eval "rs.status()"


### 1.5 Cargar los datos de las colecciones empleados, departamentos y ventas:
Asegúrate de que los archivos JSON estén en la carpeta del proyecto.

Get-Content ./empleados.json | docker exec -i mongo1 mongoimport --db escuela --collection empleados --jsonArray
Get-Content ./departamentos.json | docker exec -i mongo1 mongoimport --db escuela --collection departamentos --jsonArray
Get-Content ./ventas.json | docker exec -i mongo1 mongoimport --db escuela --collection ventas --jsonArray

### 1.6 Verificar que los datos se hayan importado correctamente:

docker exec -it mongo1 mongosh --eval "db.getSiblingDB('escuela').empleados.countDocuments()"
docker exec -it mongo1 mongosh --eval "db.getSiblingDB('escuela').departamentos.countDocuments()"
docker exec -it mongo1 mongosh --eval "db.getSiblingDB('escuela').ventas.countDocuments()"


## 2. Ejecutar las consultas de la Parte C dentro de mongosh en la base escuela.

## 3. Probar resiliencia (Parte D):

docker stop mongo3        # Apagar un nodo

### 3.1 Ejecutar alguna consulta para ver que sigue funcionando
docker start mongo3       # Prender el nodo
docker exec -it mongo1 mongosh --eval "rs.status()"

## 4. Versiones usadas
Docker Desktop: ≥ 4.x
Docker Compose: ≥ 1.29
MongoDB: 7.0
Mongosh: 2.5.8

## 5. Dificultades y cómo se resolvieron (breve)
Importación de JSON fallida por duplicados: Se solucionó eliminando las colecciones con db.<coleccion>.drop() antes de importar.

Redirección < en PowerShell no funciona: Se usó Get-Content <archivo> | docker exec -i mongo1 mongoimport --jsonArray.

Consultas que devolvían 0 documentos: Se corrigió usando db.getSiblingDB('escuela') para apuntar a la base correcta.

Error de sintaxis en rs.initiate(): Se solucionó usando comillas correctas y nombres de host entre ' '.

## 6. Justificación de comandos y conceptos
rs.status() se usa en un ReplicaSet para ver el estado de los nodos (PRIMARY, SECONDARY, DOWN).

sh.status() se usa en clusters shardeados para ver la distribución de datos entre shards. Como este escenario es un ReplicaSet y no un cluster shardeado, sh.status() no aplica.

Un shard es un fragmento de la base de datos que almacena una parte de los datos.

El sharding es la técnica de particionar horizontalmente los datos entre varios shards para escalar horizontalmente y balancear carga.

## 7. Observaciones finales
Se recomienda ejecutar primero todas las consultas con los 3 nodos encendidos y luego apagar un nodo (mongo3) para verificar la resiliencia.

Los pipelines de consultas se deben ejecutar con Aggregation Pipeline y se deben incluir comentarios explicando la lógica de cada operación.