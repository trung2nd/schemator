export const SET_TABLES = "SET_TABLES";
export const ADD_TABLE = "ADD_TABLE";

/**
 * Get action to set tables
 *
 * @param {object[]} tables Specified tables
 * @param {string} tables[].id Table ID
 * @param {string} tables[].name Table name
 * @param {number} tables[].timestamp Table creation date timestamp
 * @param {object} tables[].position Table position
 * @param {number} tables[].position.x Position X
 * @param {number} tables[].position.y Position Y
 * @param {object[]} tables[].fields Table field list
 * @param {string} tables[].fields[].id Field ID
 * @param {string} tables[].fields[].name Field name
 * @param {string} tables[].fields[].type Field type
 * @returns {object} Action
 */
export const setTables = tables => ({
  type: SET_TABLES,
  payload: tables
});

/**
 * Get action to add new table
 *
 * @param {object} table Specified table
 * @param {string} table.id Table ID
 * @param {string} table.name Table name
 * @param {number} table.timestamp Table creation date timestamp
 * @param {object} table.position Table position
 * @param {number} table.position.x Position X
 * @param {number} table.position.y Position Y
 * @param {object[]} table.fields Table field list
 * @param {string} table.fields[].id Field ID
 * @param {string} table.fields[].name Field name
 * @param {string} table.fields[].type Field type
 * @returns {object} Action
 */
export const addTable = table => ({
  type: ADD_TABLE,
  payload: table
});
