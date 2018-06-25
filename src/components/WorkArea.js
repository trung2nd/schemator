/* global chrome */

import React, { Component, createRef } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import * as d3 from "d3";
import { connect } from "react-redux";
import uuid from "uuid/v4";

import {
  addField,
  updateField,
  removeField,
  updateTable,
  addRelation,
  removeRelation,
  removeTable,
  addTable
} from "../store/actions";
import { capitalize } from "../helpers/formatter";
import { randomBetween } from "../helpers/math";
import TableBox from "./TableBox";

const Container = styled.div`
  flex: 1;
  display: flex;
`;

const Area = styled.svg`
  flex: 1;
  background: #333;
`;

const RelationLine = styled.path`
  fill: none;
  stroke: white;
  stroke-width: 2px;
`;

class WorkArea extends Component {
  constructor(props) {
    super(props);

    this.state = {
      offset: {
        x: 0,
        y: 0
      }
    };

    this.area = createRef();
    this.activeTable = null;
    this.tables = [];

    this.getPathPoints = this.getPathPoints.bind(this);
    this.getMousePosition = this.getMousePosition.bind(this);
    this.saveTableOffset = this.saveTableOffset.bind(this);
    this.addField = this.addField.bind(this);
    this.updateField = this.updateField.bind(this);
    this.removeField = this.removeField.bind(this);
    this.addTable = this.addTable.bind(this);
    this.removeTable = this.removeTable.bind(this);
    this.updateTableName = this.updateTableName.bind(this);
    this.updateTablePosition = this.updateTablePosition.bind(this);
  }

  componentDidMount() {
    this.createLines();
    this.createContextMenus();
  }

  /**
   * Create all context menus
   *
   * @memberof WorkArea
   */
  createContextMenus() {
    chrome.contextMenus.create({
      id: "remove-table",
      title: "Remove Table",
      contexts: ["all"],
      visible: false
    });

    chrome.contextMenus.create({
      id: "add-table",
      title: "Add Table",
      contexts: ["all"],
      visible: false
    });

    chrome.contextMenus.create({
      id: "add-field",
      title: "Add Field",
      contexts: ["all"],
      visible: false
    });
  }

  componentWillReceiveProps(nextProps) {
    const getID = item => item.id;
    const newData = items => id => !items.includes(id);

    const { tables } = nextProps;
    const tableIDs = tables.map(getID);
    const refTableIDs = this.tables.map(getID);
    const addedTables = tableIDs.filter(newData(refTableIDs));
    const removedTables = refTableIDs.filter(newData(tableIDs));

    if (addedTables.length > 0) {
      this.tables = [
        ...this.tables,
        ...addedTables.map(id => ({
          id,
          ref: createRef()
        }))
      ];
    }

    if (removedTables.length > 0) {
      this.tables = this.tables.filter(newData(removedTables));
    }
  }

  /**
   * Get relation line path points
   *
   * @param {object} fromTablePosition Position of table which has foreign key
   * @param {number} fromTablePosition.x Position X
   * @param {number} fromTablePosition.y Position Y
   * @param {object} toTablePosition Position of destination table
   * @param {number} toTablePosition.x Position X
   * @param {number} toTablePosition.y Position Y
   * @param {number} fieldIndex Index of foreign key field relative from it's table
   * @returns {string} Path points
   * @memberof WorkArea
   */
  getPathPoints(fromTablePosition, toTablePosition, fieldIndex) {
    const { x: fPosX, y: fPosY } = fromTablePosition;
    const { x: tPosX, y: tPosY } = toTablePosition;
    const headerHeight = 36;
    const inputHeight = 38;
    const tableWidth = 240;
    const curvePoint = 64;
    const halfHeaderHeight = headerHeight / 2;
    const inputY = headerHeight + fieldIndex * inputHeight + inputHeight / 2;
    const isFromTableInRight = fPosX > tPosX;
    let points = "";

    if (isFromTableInRight) {
      points = `
        M${fPosX + halfHeaderHeight} ${fPosY + inputY} 
        C${fPosX - curvePoint} ${fPosY + inputY} 
          ${tPosX + tableWidth + curvePoint} ${tPosY + halfHeaderHeight} 
          ${tPosX + tableWidth} ${tPosY + halfHeaderHeight}
      `;
    } else {
      points = `
        M${fPosX + tableWidth - halfHeaderHeight} ${fPosY + inputY} 
        C${fPosX + tableWidth + curvePoint} ${fPosY + inputY} 
          ${tPosX - curvePoint} ${tPosY + halfHeaderHeight} 
          ${tPosX + halfHeaderHeight} ${tPosY + halfHeaderHeight}
      `;
    }

    return points;
  }

  /**
   * Get mouse position in SVG coordinate system
   *
   * @param {object} event DOM event
   * @returns {object} Mouse position
   * @memberof WorkArea
   */
  getMousePosition(event) {
    const ctm = this.area.current.getScreenCTM();

    return {
      x: (event.clientX - ctm.e) / ctm.a,
      y: (event.clientY - ctm.f) / ctm.d
    };
  }

  /**
   * Save table offset from the top left of object
   *
   * @param {number} tableID Table ID
   * @memberof WorkArea
   */
  saveTableOffset(tableID) {
    return event => {
      const byID = item => item.id === tableID;
      this.activeTable = this.tables.find(byID).ref;

      const getAttributeNS = attr => {
        const activeTableDOM = this.activeTable.current;
        return parseFloat(activeTableDOM.getAttributeNS(null, attr));
      };
      const offset = this.getMousePosition(event);

      offset.x -= getAttributeNS("x");
      offset.y -= getAttributeNS("y");

      this.setState({ offset });
    };
  }

  /**
   * Create guide lines
   *
   * @memberof WorkArea
   */
  createLines() {
    const parent = d3.select(this.area.current);
    const gap = 16;
    const totalHorizontalLines = parseInt(this.area.current.clientHeight / gap);
    const totalVerticalLines = parseInt(this.area.current.clientWidth / gap);

    [...Array(totalHorizontalLines)].forEach((_, index) => {
      const y = (index + 1) * gap;

      parent
        .insert("line", "*")
        .attr("x1", 0)
        .attr("y1", y)
        .attr("x2", "100%")
        .attr("y2", y)
        .attr("stroke", "#3a3a3a")
        .attr("stroke-width", 1)
        .attr("shape-rendering", "crispEdges");
    });

    [...Array(totalVerticalLines)].forEach((_, index) => {
      const x = (index + 1) * gap;

      parent
        .insert("line", "*")
        .attr("x1", x)
        .attr("y1", 0)
        .attr("x2", x)
        .attr("y2", "100%")
        .attr("stroke", "#3a3a3a")
        .attr("stroke-width", 1)
        .attr("shape-rendering", "crispEdges");
    });
  }

  /**
   * Add new field inside table
   *
   * @param {number} tableID Table ID
   * @memberof WorkArea
   */
  addField(tableID) {
    this.activeTable = null;

    const { createField } = this.props;
    const data = {
      tableID,
      id: uuid(),
      name: "field",
      type: "INTEGER"
    };

    createField(data);
  }

  /**
   * Update field data inside table
   *
   * @param {string} type Input type
   * @memberof WorkArea
   */
  updateField(type) {
    const {
      tables,
      fields,
      relations,
      modifyField,
      createRelation,
      deleteRelation
    } = this.props;

    return (event, fieldID) => {
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

      modifyField(fieldID, data);
    };
  }

  /**
   * Remove existing field
   *
   * @param {number} fieldID Field ID
   * @memberof WorkArea
   */
  removeField(fieldID) {
    const { fields, relations, deleteField, deleteRelation } = this.props;
    const field = fields.find(item => item.id === fieldID);
    const relation = relations.find(item => item.fieldID === fieldID);

    if (field.name.endsWith("_id") && relation) {
      deleteRelation(relation.id);
    }

    deleteField(fieldID);
  }

  /**
   * Add new table
   *
   * @memberof WorkArea
   */
  addTable() {
    const { createTable, createField, tables } = this.props;
    const positions = tables.map(item => item.position);
    const appWindow = chrome.app.window.get("main");
    let newPosition;

    const isNotSameWith = pos => item => item.x !== pos.x && item.y !== pos.y;

    while (true) {
      newPosition = {
        x: randomBetween(16, appWindow.innerBounds.width - 240),
        y: randomBetween(64, appWindow.innerBounds.height - 240)
      };

      if (positions.every(isNotSameWith(newPosition))) {
        break;
      }
    }

    const newTable = {
      id: uuid(),
      name: "NewTable",
      timestamp: Date.now(),
      position: newPosition
    };

    const newField = {
      id: uuid(),
      tableID: newTable.id,
      name: "id",
      type: "INCREMENT"
    };

    createTable(newTable);
    createField(newField);
  }

  /**
   * Remove a table
   *
   * @param {number} tableID Table ID
   * @memberof WorkArea
   */
  removeTable(tableID) {
    const {
      relations,
      fields,
      deleteTable,
      deleteField,
      deleteRelation
    } = this.props;

    const getID = item => item.id;
    const byThisTable = field => item => item[field] === tableID;

    relations
      .filter(byThisTable("toTable"))
      .map(getID)
      .forEach(deleteRelation);

    fields
      .filter(byThisTable("tableID"))
      .map(getID)
      .forEach(deleteField);

    deleteTable(tableID);

    this.tables = this.tables.filter(item => item.id !== tableID);

    chrome.contextMenus.update("remove-table", { visible: false });
    chrome.contextMenus.update("add-field", { visible: false });
    chrome.contextMenus.update("add-table", {
      visible: true,
      onclick: this.addTable
    });
  }

  /**
   * Update table name
   *
   * @param {number} tableID Table ID
   * @memberof WorkArea
   */
  updateTableName(tableID) {
    const {
      fields,
      relations,
      modifyTable,
      deleteRelation,
      createRelation
    } = this.props;

    return event => {
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

      modifyTable(tableID, data);
    };
  }

  /**
   * Update table position
   *
   * @param {object} event DOM event
   * @memberof WorkArea
   */
  updateTablePosition(tableID) {
    const { offset } = this.state;
    const { modifyTable } = this.props;

    return event => {
      if (this.activeTable) {
        event.preventDefault();

        const activeTableDOM = this.activeTable.current;
        const coord = this.getMousePosition(event);
        const x = coord.x - offset.x;
        const y = coord.y - offset.y;

        activeTableDOM.setAttributeNS(null, "x", x);
        activeTableDOM.setAttributeNS(null, "y", y);

        modifyTable(tableID, {
          position: { x, y }
        });
      }
    };
  }

  render() {
    const { project, tables, fields, relations } = this.props;
    const byTableID = tableID => item => item.tableID === tableID;
    const byID = itemID => item => item.id === itemID;

    return (
      <Container>
        <Area
          innerRef={this.area}
          onMouseUp={event => {
            this.activeTable = null;
          }}
          onMouseEnter={() => {
            chrome.contextMenus.update("add-table", {
              visible: !!project,
              onclick: this.addTable
            });
          }}
          onMouseLeave={() => {
            chrome.contextMenus.update("add-table", {
              visible: false
            });
          }}
        >
          {relations.map(relation => {
            const { fieldID, fromTableID, toTableID } = relation;
            const fieldIndex = fields
              .filter(byTableID(fromTableID))
              .findIndex(byID(fieldID));
            const fromTable = tables.find(byID(fromTableID));
            const toTable = tables.find(byID(toTableID));

            if (fromTable && toTable) {
              const points = this.getPathPoints(
                fromTable.position,
                toTable.position,
                fieldIndex
              );
              return <RelationLine key={relation.id} d={points} />;
            }

            return null;
          })}
          {tables.map((table, index) => {
            const currentFields = fields.filter(byTableID(table.id));
            const { ref } = this.tables.find(byID(table.id));

            return (
              <TableBox
                key={table.id}
                ref={ref}
                {...table}
                fields={currentFields}
                onMouseDown={this.saveTableOffset(table.id)}
                onMouseMove={this.updateTablePosition(table.id)}
                onMouseEnter={() => {
                  chrome.contextMenus.update("add-table", {
                    visible: false
                  });

                  chrome.contextMenus.update("remove-table", {
                    visible: true,
                    onclick: () => this.removeTable(table.id)
                  });

                  chrome.contextMenus.update("add-field", {
                    visible: true,
                    onclick: () => this.addField(table.id)
                  });
                }}
                onMouseLeave={() => {
                  chrome.contextMenus.update("add-table", {
                    visible: true,
                    onclick: this.addTable
                  });

                  chrome.contextMenus.update("remove-table", {
                    visible: false
                  });

                  chrome.contextMenus.update("add-field", {
                    visible: false
                  });
                }}
                onClickAddField={() => this.addField(table.id)}
                onClickRemoveField={this.removeField}
                onChangeFieldName={this.updateField("name")}
                onChangeFieldType={this.updateField("type")}
                onChangeName={this.updateTableName(table.id)}
              />
            );
          })}
        </Area>
      </Container>
    );
  }
}

WorkArea.propTypes = {
  project: PropTypes.object,
  tables: PropTypes.array,
  fields: PropTypes.array,
  relations: PropTypes.array,
  createTable: PropTypes.func,
  modifyTable: PropTypes.func,
  deleteTable: PropTypes.func,
  modifyField: PropTypes.func,
  createField: PropTypes.func,
  deleteField: PropTypes.func,
  createRelation: PropTypes.func,
  deleteRelation: PropTypes.func
};

const mapStateToProps = state => state;

const mapDispatchToProps = dispatch => ({
  createField: field => dispatch(addField(field)),
  deleteField: fieldID => dispatch(removeField(fieldID)),
  createTable: table => dispatch(addTable(table)),
  modifyTable: (id, data) => dispatch(updateTable(id, data)),
  deleteTable: id => dispatch(removeTable(id)),
  modifyField: (id, data) => dispatch(updateField(id, data)),
  createRelation: relation => dispatch(addRelation(relation)),
  deleteRelation: relationID => dispatch(removeRelation(relationID))
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(WorkArea);
