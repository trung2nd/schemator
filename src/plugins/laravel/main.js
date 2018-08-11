import {
  createTable,
  createField,
  createOption,
  createRelation
} from "../../helpers/extension";

// Option checkboxes would be used in table
const tableOptions = [
  {
    id: "id",
    label: "ID"
  },
  {
    id: "rememberToken",
    label: "Remember Token"
  },
  {
    id: "softDeletes",
    label: "Soft Deletes"
  },
  {
    id: "timestamps",
    label: "Timestamps"
  }
];

// Types would be used as field type
const fieldTypes = [
  "BIG_INT",
  "BINARY",
  "BOOLEAN",
  "CHAR",
  "DATE",
  "DATE_TIME",
  "DATE_TIME_TZ",
  "DECIMAL",
  "DOUBLE",
  "ENUM",
  "FLOAT",
  "INTEGER",
  "IP_ADDRESS",
  "JSON",
  "JSONB",
  "LONG_TEXT",
  "MAC_ADDRESS",
  "MEDIUM_INT",
  "MEDIUM_TEXT",
  "MORPHS",
  "NULLABLE_MORPHS",
  "SMALL_INT",
  "STRING",
  "TEXT",
  "TIME",
  "TIME_TZ",
  "TINY_INT",
  "TIMESTAMP",
  "TIMESTAMP_TZ",
  "U_BIG_INT",
  "U_INT",
  "U_MEDIUM_INT",
  "U_SMALL_INT",
  "U_TINY_INT",
  "UUID"
];

/**
 * Invoked while plugin initialized.
 * i.e. after create new project based on this extension.
 * We can initialize new scheme here.
 *
 * @returns {object} Created Scheme
 */
const onInit = () => {
  const tables = [
    createTable(
      "User",
      [
        createOption("id", "ID", true),
        createOption("rememberToken", "Remember Token", true),
        createOption("softDeletes", "Soft Deletes"),
        createOption("timestamps", "Timestamps", true)
      ],
      { x: 128, y: 128 }
    )
  ];

  const fields = [
    createField(tables[0].id, "name", "STRING"),
    createField(tables[0].id, "email", "STRING"),
    createField(tables[0].id, "password", "TEXT")
  ];

  const scheme = {
    tables,
    fields
  };

  return scheme;
};

/**
 * Invoked while table would be created from context menu.
 * You can define table data here.
 *
 * @param {object} cursorPosition
 * @param {number} cursorPosition.x
 * @param {number} cursorPosition.y
 * @returns {object} Created table with it's field
 */
const onCreateTable = cursorPosition => {
  const table = createTable(
    "Table",
    [
      createOption("id", "ID", true),
      createOption("rememberToken", "Remember Token"),
      createOption("softDeletes", "Soft Deletes"),
      createOption("timestamps", "Timestamps", true)
    ],
    cursorPosition
  );

  const field = createField(table.id, "field", "INTEGER");
  const scheme = { table, field };

  return scheme;
};

/**
 * Invoked while table would be updated.
 * i.e. change table name only.
 *
 * @param {object} table
 * @param {string} table.id
 * @param {string} table.name
 * @param {object} data
 * @param {object[]} data.tables
 * @param {object[]} data.fields
 */
const onUpdateTable = (table, data) => {
  const { fields } = data;
  const foreignKey = `${table.name.toLowerCase()}_id`;
  const foreignFields = fields.filter(field => field.name === foreignKey);
  const relations = foreignFields.map(field =>
    createRelation(field.id, field.tableID, table.id)
  );

  return relations;
};

// Invoked while table would be deleted.
// You can remove table relation here.
const onDeleteTable = () => {};

/**
 * Invoked while field in a table would be created
 * from context menu or button.
 * You can define field data here.
 *
 * @param {string} tableID
 * @returns {object} Created field
 */
const onCreateField = tableID => {
  return createField(tableID, "field", "INTEGER");
};

/**
 * Invoked while field in a table would be updated.
 * i.e. change field name and type.
 *
 * @param {object} action
 * @param {string} action.fieldID
 * @param {string} action.updateType
 * @param {string} action.updateData
 * @param {object} data
 * @param {object[]} data.tables
 * @param {object[]} data.fields
 * @param {object[]} data.relations
 * @return {object} Created relation
 */
const onUpdateField = (action, data) => {
  const { tables, fields, relations } = data;
  const { fieldID, updatedType, updatedData } = action;
  const relation = relations.find(item => item.fieldID === fieldID);

  if (updatedType === "name") {
    if (updatedData.endsWith("_id")) {
      const lowercasedTableName = updatedData.replace("_id", "");
      const tableInitial = lowercasedTableName.charAt(0).toUpperCase();
      const tableName = tableInitial + lowercasedTableName.substr(1);

      const field = fields.find(item => item.id === fieldID);
      const fromTable = tables.find(item => item.id === field.tableID);
      const toTable = tables.find(item => item.name === tableName);

      if (fromTable && toTable && !relation) {
        return {
          type: "CREATE",
          relation: createRelation(field.id, fromTable.id, toTable.id)
        };
      }
    }
  }

  return relation && { type: "DELETE", relation };
};

// Invoked while field in a table would be deleted.
const onDeleteField = () => {};

// Invoked while project would be exported.
// You can define exported data here.
const onExport = () => {};

export default {
  tableOptions,
  fieldTypes,
  onInit,
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
  onCreateField,
  onUpdateField,
  onDeleteField,
  onExport
};
