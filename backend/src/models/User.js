import { DataTypes } from 'sequelize';

/**
 * User model for authentication
 */
export function defineUserModel(sequelize) {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        password_hash: {
            type: DataTypes.STRING,
            allowNull: true, // null for Google OAuth users
        },
        google_id: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        avatar: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        // User's own API keys (encrypted)
        gemini_api_key: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        deepseek_api_key: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        // Preferred LLM provider
        preferred_llm: {
            type: DataTypes.ENUM('gemini', 'deepseek'),
            defaultValue: 'gemini',
        },
        // License key from admin.hailamdev.space
        license_key: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        license_valid_until: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        license_status: {
            type: DataTypes.ENUM('active', 'expired', 'invalid', 'none'),
            defaultValue: 'none',
        },
    }, {
        tableName: 'users',
        timestamps: true,
    });

    return User;
}

export default defineUserModel;
