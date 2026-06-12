"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("SubscriptionSkips", "startDate", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn("SubscriptionSkips", "endDate", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('SubscriptionSkips', 'startDate');
    await queryInterface.removeColumn('SubscriptionSkips', 'endDate');
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
