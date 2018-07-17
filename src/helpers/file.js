import uuid from "uuid/v4";
import path from "path";
import pluralize from "pluralize";
import { format } from "date-fns";

import {
  setProject,
  setTables,
  setFields,
  setRelations,
  updateProject
} from "../store/actions";
import store from "../store/store";
import { modelTemplate, migrationTemplate } from "./template";
import { toSnakeCase } from "./formatter";

const { remote } = window.require("electron");
const fs = window.require("fs");

/**
 * Open dialog to create new project file
 *
 * @param {function} [callback]
 */
export const createProject = callback => {
  const { dialog } = remote;
  const mainWindow = remote.getCurrentWindow();

  dialog.showSaveDialog(
    mainWindow,
    {
      filters: [
        {
          name: "JSON files",
          extensions: ["json"]
        }
      ]
    },
    filePath => {
      if (filePath === undefined) {
        dialog.showErrorBox("Error", "You should define your project name !");
        return;
      }

      const name = path.basename(filePath, ".json");

      const project = {
        name,
        timestamp: Date.now(),
        zoom: 100
      };

      const tables = [
        {
          id: uuid(),
          name: "User",
          timestamp: Date.now(),
          position: {
            x: 128,
            y: 128
          },
          options: {
            id: true,
            rememberToken: true,
            softDeletes: false,
            timestamps: true
          }
        }
      ];

      const fields = [
        {
          id: uuid(),
          tableID: tables[0].id,
          name: "name",
          type: "STRING"
        },
        {
          id: uuid(),
          tableID: tables[0].id,
          name: "email",
          type: "STRING"
        },
        {
          id: uuid(),
          tableID: tables[0].id,
          name: "password",
          type: "STRING"
        }
      ];

      const data = {
        project,
        tables,
        fields
      };

      const content = JSON.stringify(data, null, 2);

      fs.writeFile(filePath, content, error => {
        if (error) {
          dialog.showErrorBox("Error", error.message);
          return;
        }

        store.dispatch(setProject({ ...project, isModified: false }));
        store.dispatch(setTables(tables));
        store.dispatch(setFields(fields));
        store.dispatch(setRelations([]));

        if (callback) {
          callback(filePath);
        }
      });
    }
  );
};

/**
 * Open dialog to load existing project
 *
 * @param {function} [callback]
 */
export const openProject = callback => {
  const { dialog } = remote;
  const mainWindow = remote.getCurrentWindow();

  dialog.showOpenDialog(
    mainWindow,
    {
      properties: ["openFile"],
      filters: [
        {
          name: "JSON files",
          extensions: ["json"]
        }
      ]
    },
    filePaths => {
      if (filePaths === undefined) {
        dialog.showErrorBox("Error", "No file selected !");
        return;
      }

      const filePath = filePaths[0];

      fs.readFile(filePath, "utf-8", (error, content) => {
        if (error) {
          dialog.showErrorBox("Error", error.message);
          return;
        }

        const { project, tables, fields, relations } = JSON.parse(content);

        store.dispatch(
          setProject({
            ...project,
            zoom: project.zoom || 100
          })
        );

        if (tables) {
          store.dispatch(setTables(tables));
        }

        if (fields) {
          store.dispatch(setFields(fields));
        }

        if (relations) {
          store.dispatch(setRelations(relations));
        }

        if (callback) {
          callback(filePath);
        }
      });
    }
  );
};

/**
 * Save current project
 *
 * @param {string} filePath Path to save the project file
 * @param {function} [callback]
 */
export const saveProject = (filePath, callback) => {
  const { project, tables, fields, relations } = store.getState();
  const { isModified, ...newProject } = project;
  const { dialog } = remote;

  const data = {
    project: newProject,
    tables,
    fields,
    relations
  };

  const content = JSON.stringify(data, null, 2);

  fs.writeFile(filePath, content, error => {
    if (error) {
      dialog.showErrorBox("Error", error.message);
      return;
    }

    store.dispatch(updateProject({ isModified: false }));

    if (callback) {
      callback();
    }
  });
};

/**
 * Export to Laravel model and migration
 *
 * @param {function} [callback]
 */
export const toLaravel = callback => {
  const { project, tables, fields } = store.getState();
  const { dialog } = remote;
  const mainWindow = remote.getCurrentWindow();

  dialog.showOpenDialog(
    mainWindow,
    {
      properties: ["openDirectory"]
    },
    dirPaths => {
      if (dirPaths === undefined) {
        dialog.showErrorBox("Error", "No folder selected !");
        return;
      }

      const dirPath = dirPaths[0];
      const exportPath = `${dirPath}/${project.name}`;
      const modelPath = `${exportPath}/app`;
      const databasePath = `${exportPath}/database`;
      const migrationPath = `${databasePath}/migrations`;

      fs.mkdirSync(exportPath);
      fs.mkdirSync(modelPath);
      fs.mkdirSync(databasePath);
      fs.mkdirSync(migrationPath);

      tables.forEach(table => {
        const byTable = field => field.tableID === table.id;

        const modelName = table.name;
        const tableName = pluralize(toSnakeCase(modelName));
        const date = format(table.timestamp, "YYYY_MM_DD_HHmmss");
        const modelFilename = `${modelName}.php`;
        const migrationFilename = `${date}_create_${tableName}_table.php`;
        const tableFields = fields.filter(byTable);
        const fillable = tableFields.map(item => item.name);
        const model = modelTemplate(modelName, fillable);
        const migration = migrationTemplate(
          modelName,
          table.options,
          tableFields
        );

        fs.writeFileSync(`${modelPath}/${modelFilename}`, model);
        fs.writeFileSync(`${migrationPath}/${migrationFilename}`, migration);
      });

      if (callback) {
        callback();
      }
    }
  );
};
