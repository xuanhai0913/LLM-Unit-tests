import { Sequelize, DataTypes } from 'sequelize';
import config from '../config/index.js';

// Initialize Sequelize with SQLite
const sequelize = new Sequelize(config.database.url, {
    logging: config.nodeEnv === 'development' ? console.log : false,
});

// Generation Model - stores test generation history
const Generation = sequelize.define('Generation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    sourceCode: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    specs: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    generatedTests: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    framework: {
        type: DataTypes.STRING,
        defaultValue: 'pytest',
    },
    language: {
        type: DataTypes.STRING,
        defaultValue: 'python',
    },
    generationTime: {
        type: DataTypes.INTEGER, // in milliseconds
        allowNull: true,
    },
    isValid: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'generations',
    timestamps: true,
});

// Initialize database
export async function initDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Sync models (create tables if not exist)
        await sequelize.sync({ force: false });
        console.log('✅ Database models synchronized');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}

export { sequelize, Generation };
export default { sequelize, Generation, initDatabase };
