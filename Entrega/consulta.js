/*****************************
 * CONSULTAS PRÁCTICA BD DISTRIBUIDAS
 * Todas las consultas usando Aggregation Pipeline
 *****************************/

/************** 1. Empleados con salario mayor al promedio de la empresa **************/

// Método 1 — Con ventanas ($setWindowFields)
db.empleados.aggregate([
  {
    $setWindowFields: {
      partitionBy: null,
      output: { promEmpresa: { $avg: "$salario" } }
    }
  },
  { $match: { $expr: { $gt: ["$salario", "$promEmpresa"] } } },
  { $project: { nombre: 1, salario: 1, promEmpresa: 1, _id: 0 } }
]);

// Método 2 — Sin ventanas (variable en el cliente)
var promedio = db.empleados.aggregate([
  { $group: { _id: null, promEmpresa: { $avg: "$salario" } } }
]).toArray()[0].promEmpresa;

db.empleados.aggregate([
  { $match: { $expr: { $gt: ["$salario", promedio] } } },
  { $project: { nombre: 1, salario: 1, _id: 0 } }
]);

/************** 2. Departamentos sin empleados asignados **************/
db.departamentos.aggregate([
  { $lookup: { from: "empleados", localField: "_id", foreignField: "departamento_id", as: "empleados" } },
  { $addFields: { count: { $size: "$empleados" } } },
  { $match: { count: 0 } },
  { $project: { nombre: 1, _id: 0 } }
]);

/************** 3. Empleado con salario más alto **************/
// Opción A — $sort + $limit
db.empleados.aggregate([
  { $sort: { salario: -1 } },
  { $limit: 1 },
  { $project: { nombre: 1, salario: 1, departamento_id: 1, _id: 0 } }
]);

// Opción B — $group + $max + $lookup
db.empleados.aggregate([
  { $group: { _id: null, salarioMax: { $max: "$salario" } } },
  {
    $lookup: {
      from: "empleados",
      localField: "salarioMax",
      foreignField: "salario",
      as: "empleadoTop"
    }
  },
  { $unwind: "$empleadoTop" },
  { $project: { nombre: "$empleadoTop.nombre", salario: "$empleadoTop.salario", departamento_id: "$empleadoTop.departamento_id", _id: 0 } }
]);

/************** 4. Salario promedio por departamento para cada empleado **************/
// Opción A — Con ventanas
db.empleados.aggregate([
  {
    $setWindowFields: {
      partitionBy: "$departamento_id",
      output: { promDepartamento: { $avg: "$salario" } }
    }
  },
  { $project: { nombre: 1, salario: 1, departamento_id: 1, promDepartamento: 1, _id: 0 } }
]);

// Opción B — Sin ventanas ($lookup)
db.empleados.aggregate([
  {
    $lookup: {
      from: "empleados",
      let: { dep: "$departamento_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$departamento_id", "$$dep"] } } },
        { $group: { _id: null, promDepartamento: { $avg: "$salario" } } }
      ],
      as: "promDep"
    }
  },
  { $unwind: "$promDep" },
  { $project: { nombre: 1, salario: 1, departamento_id: 1, promDepartamento: "$promDep.promDepartamento", _id: 0 } }
]);

/************** 5. Departamentos cuyo promedio salarial > promedio general **************/
// Opción A — Con ventanas
db.empleados.aggregate([
  { $group: { _id: "$departamento_id", promDep: { $avg: "$salario" } } },
  { $setWindowFields: { partitionBy: null, output: { promGlobal: { $avg: "$promDep" } } } },
  { $match: { $expr: { $gt: ["$promDep", "$promGlobal"] } } },
  { $project: { departamento_id: "$_id", promDep: 1, promGlobal: 1, _id: 0 } }
]);

// Opción B — Sin ventanas ($lookup y doble pipeline)
db.departamentos.aggregate([
  { $lookup: { from: "empleados", localField: "_id", foreignField: "departamento_id", as: "empleadosDept" } },
  { $addFields: { promDep: { $avg: "$empleadosDept.salario" } } },
  { $group: { _id: null, promGlobal: { $avg: "$promDep" }, departamentos: { $push: { departamento_id: "$_id", promDep: "$promDep" } } } },
  { $unwind: "$departamentos" },
  { $replaceRoot: { newRoot: "$departamentos" } },
  { $match: { $expr: { $gt: ["$promDep", "$promGlobal"] } } }
]);

/************** 6. Ventas: sucursal “top” por mes **************/
// Opción A — Ordenar y $first
db.ventas.aggregate([
  { $sort: { "_id.mes": 1, total: -1 } },
  { $group: { _id: "$_id.mes", sucursalTop: { $first: "$_id.sucursal" }, totalTop: { $first: "$total" } } },
  { $project: { mes: "$_id", sucursalTop: 1, totalTop: 1, _id: 0 } },
  { $sort: { mes: 1 } }
]);

// Opción B — Usando $topN (MongoDB ≥5)
db.ventas.aggregate([
  { $group: { _id: "$_id.mes", topSucursal: { $topN: { output: { sucursal: "$_id.sucursal", total: "$total" }, sortBy: { total: -1 }, n: 1 } } } },
  { $unwind: "$topSucursal" },
  { $project: { mes: "$_id", sucursalTop: "$topSucursal.sucursal", totalTop: "$topSucursal.total", _id: 0 } },
  { $sort: { mes: 1 } }
]);
