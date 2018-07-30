import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import uuid from "uuid/v4";

import { capitalize } from "../../helpers/formatter";
import { updateProject } from "../../store/actions/project";
import { updateTable } from "../../store/actions/tables";
import { updateField, removeField } from "../../store/actions/fields";
import { addRelation, removeRelation } from "../../store/actions/relations";
import TableList from "../presentational/TableList";

class TableListContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      offset: {
        x: 0,
        y: 0
      }
    };

    this.activeTable = null;

    this.updateTableName = this.updateTableName.bind(this);
    this.updateTablePosition = this.updateTablePosition.bind(this);
    this.updateTableOptions = this.updateTableOptions.bind(this);
    this.getMousePosition = this.getMousePosition.bind(this);
    this.saveTableOffset = this.saveTableOffset.bind(this);
    this.updateField = this.updateField.bind(this);
    this.removeField = this.removeField.bind(this);
  }

  /**
   * Get mouse position in SVG coordinate system
   *
   * @param {object} event DOM event
   * @returns {object} Mouse position
   * @memberof WorkArea
   */
  getMousePosition(event) {
    const { areaRef } = this.props;
    const ctm = areaRef.current.getScreenCTM();

    return {
      x: (event.clientX - ctm.e) / ctm.a,
      y: (event.clientY - ctm.f) / ctm.d
    };
  }

  /**
   * Save table offset from the top left of object
   *
   * @param {object} event DOM event
   * @param {number} tableID Table ID
   * @memberof WorkArea
   */
  saveTableOffset(event, tableID) {
    const { tables } = this.props;
    const byID = item => item.id === tableID;
    this.activeTable = tables.find(byID).ref;

    const getAttributeNS = attr => {
      const activeTableDOM = this.activeTable.current;
      return parseFloat(activeTableDOM.getAttributeNS(null, attr));
    };
    const offset = this.getMousePosition(event);

    offset.x -= getAttributeNS("x");
    offset.y -= getAttributeNS("y");

    this.setState({ offset });
  }

  /**
   * Update field data inside table
   *
   * @param {object} event DOM event
   * @param {string} fieldID Field ID
   * @param {string} type Input type
   * @memberof WorkArea
   */
  updateField(event, fieldID, type) {
    const {
      tables,
      fields,
      relations,
      modifyProject,
      modifyField,
      createRelation,
      deleteRelation
    } = this.props;
    const { value } = event.target;

    if (type === "name") {
      const relation = relations.find(item => item.fieldID === fieldID);

      if (value.endsWith("_id")) {
        const tableName = capitalize(value.replace("_id", ""));
        const field = fields.find(item => item.id === fieldID);
        const fromTable = tables.find(item => item.id === field.tableID);
        const toTable = tables.find(item => item.name === tableName);

        if (fromTable && toTable && !relation) {
          const newRelation = {
            id: uuid(),
            fieldID: field.id,
            fromTableID: fromTable.id,
            toTableID: toTable.id
          };

          createRelation(newRelation);
        }
      } else {
        if (relation) {
          deleteRelation(relation.id);
        }
      }
    }

    const data = {
      [type]: value
    };

    modifyProject({ isModified: true });
    modifyField(fieldID, data);
  }

  /**
   * Remove existing field
   *
   * @param {number} fieldID Field ID
   * @memberof WorkArea
   */
  removeField(fieldID) {
    const {
      fields,
      relations,
      modifyProject,
      deleteField,
      deleteRelation
    } = this.props;
    const field = fields.find(item => item.id === fieldID);
    const relation = relations.find(item => item.fieldID === fieldID);

    if (field.name.endsWith("_id") && relation) {
      deleteRelation(relation.id);
    }

    modifyProject({ isModified: true });
    deleteField(fieldID);
  }

  /**
   * Update table name
   *
   * @param {object} event DOM event
   * @param {number} tableID Table ID
   * @memberof WorkArea
   */
  updateTableName(event, tableID) {
    const {
      fields,
      relations,
      modifyProject,
      modifyTable,
      deleteRelation,
      createRelation
    } = this.props;
    const { value: newTableName } = event.target;
    const fieldPrefix = newTableName.toLowerCase();
    const foreignFields = fields.filter(
      item => item.name === `${fieldPrefix}_id`
    );

    if (foreignFields.length > 0) {
      foreignFields.forEach(field => {
        const newRelation = {
          id: uuid(),
          fieldID: field.id,
          fromTableID: field.tableID,
          toTableID: tableID
        };

        createRelation(newRelation);
      });
    } else {
      const unneededRelations = relations
        .filter(item => item.toTableID === tableID)
        .map(item => item.id);

      unneededRelations.forEach(deleteRelation);
    }

    const data = {
      name: newTableName
    };

    modifyProject({ isModified: true });
    modifyTable(tableID, data);
  }

  /**
   * Update table position
   *
   * @param {object} event DOM event
   * @param {string} tableID Table ID
   * @memberof WorkArea
   */
  updateTablePosition(event, tableID) {
    const { offset } = this.state;
    const { modifyProject, modifyTable } = this.props;

    if (this.activeTable && this.activeTable.current) {
      event.preventDefault();

      const activeTableDOM = this.activeTable.current;
      const coord = this.getMousePosition(event);
      const x = coord.x - offset.x;
      const y = coord.y - offset.y;

      activeTableDOM.setAttributeNS(null, "x", x);
      activeTableDOM.setAttributeNS(null, "y", y);

      modifyProject({ isModified: true });
      modifyTable(tableID, {
        position: { x, y }
      });
    }
  }

  /**
   * Update table options like id, rememberToken, etc
   *
   * @param {object} event DOM event
   * @param {number} tableID Table ID
   * @param {string} name Option name
   * @memberof WorkArea
   */
  updateTableOptions(event, tableID, name) {
    const { tables, modifyProject, modifyTable } = this.props;
    const table = tables.find(item => item.id === tableID);

    modifyProject({ isModified: true });
    modifyTable(tableID, {
      options: {
        ...table.options,
        [name]: event.target.checked
      }
    });
  }

  render() {
    const { tables, fields, menuItems, onContextMenu } = this.props;
    const [menuAddTable, menuRemoveTable, menuAddField] = menuItems;

    return (
      <TableList
        tables={tables}
        fields={fields}
        onContextMenu={onContextMenu}
        onMouseDown={this.saveTableOffset}
        onMouseUp={() => {
          this.activeTable = null;
        }}
        onMouseMove={this.updateTablePosition}
        onMouseEnter={() => {
          if (menuAddTable) {
            menuAddTable.visible = false;
          }

          if (menuRemoveTable) {
            menuRemoveTable.visible = true;
          }

          if (menuAddField) {
            menuAddField.visible = true;
          }
        }}
        onMouseLeave={() => {
          this.activeTable = null;

          if (menuAddTable) {
            menuAddTable.visible = true;
          }

          if (menuRemoveTable) {
            menuRemoveTable.visible = false;
          }

          if (menuAddField) {
            menuAddField.visible = false;
          }
        }}
        onClickAddField={this.addField}
        onClickRemoveField={this.removeField}
        onChangeField={this.updateField}
        onChangeName={this.updateTableName}
        onChangeOptions={this.updateTableOptions}
      />
    );
  }
}

TableListContainer.propTypes = {
  tables: PropTypes.array,
  fields: PropTypes.array,
  relations: PropTypes.array,
  menuItems: PropTypes.array,
  areaRef: PropTypes.object,
  modifyProject: PropTypes.func,
  deleteField: PropTypes.func,
  modifyTable: PropTypes.func,
  modifyField: PropTypes.func,
  createRelation: PropTypes.func,
  deleteRelation: PropTypes.func,
  onContextMenu: PropTypes.func
};

const mapStateToProps = ({ tables, fields, relations }) => ({
  tables,
  fields,
  relations
});

const mapDispatchToProps = dispatch => ({
  modifyProject: project => dispatch(updateProject(project)),
  deleteField: fieldID => dispatch(removeField(fieldID)),
  modifyTable: (id, data) => dispatch(updateTable(id, data)),
  modifyField: (id, data) => dispatch(updateField(id, data)),
  createRelation: relation => dispatch(addRelation(relation)),
  deleteRelation: relationID => dispatch(removeRelation(relationID))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TableListContainer);