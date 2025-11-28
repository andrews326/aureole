"""add chattype table & message_type

Revision ID: 1f2e59cf801d
Revises: 23476a47300a
Create Date: 2025-11-19 08:19:49.240689
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1f2e59cf801d'
down_revision: Union[str, Sequence[str], None] = '23476a47300a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- 1. Create ENUM type first ---
    message_enum = postgresql.ENUM(
        'text', 'image', 'audio', 'video', 'system',
        name='message_type_enum'
    )
    message_enum.create(op.get_bind(), checkfirst=True)

    # --- 2. Create chat_media table ---
    op.create_table(
        'chat_media',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('uploader_id', sa.UUID(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('file_name', sa.String(), nullable=True),
        sa.Column('file_type', sa.String(length=32), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=True),
        sa.Column('thumb_path', sa.String(), nullable=True),
        sa.Column('processed', sa.Boolean(), nullable=False),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['uploader_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # --- 3. Add columns to messages ---
    op.add_column(
        'messages',
        sa.Column(
            'message_type',
            sa.Enum('text', 'image', 'audio', 'video', 'system', name='message_type_enum'),
            nullable=False,
            server_default='text'   # TEMP default
        )
    )

    op.add_column('messages', sa.Column('media_id', sa.UUID(), nullable=True))
    op.add_column('messages', sa.Column('meta', sa.JSON(), nullable=True))

    op.alter_column(
        'messages',
        'content',
        existing_type=sa.TEXT(),
        nullable=True
    )

    op.alter_column(
        'messages',
        'created_at',
        existing_type=postgresql.TIMESTAMP(timezone=True),
        nullable=False,
        existing_server_default=sa.text('now()')
    )

    op.create_foreign_key(None, 'messages', 'chat_media', ['media_id'], ['id'])

    # Remove temporary default
    op.alter_column('messages', 'message_type', server_default=None)


def downgrade() -> None:
    # Drop FK
    op.drop_constraint(None, 'messages', type_='foreignkey')

    op.alter_column(
        'messages',
        'created_at',
        existing_type=postgresql.TIMESTAMP(timezone=True),
        nullable=True,
        existing_server_default=sa.text('now()')
    )

    op.alter_column(
        'messages',
        'content',
        existing_type=sa.TEXT(),
        nullable=False
    )

    op.drop_column('messages', 'meta')
    op.drop_column('messages', 'media_id')
    op.drop_column('messages', 'message_type')

    # Drop chat_media table
    op.drop_table('chat_media')

    # Drop ENUM type
    message_enum = postgresql.ENUM(
        'text', 'image', 'audio', 'video', 'system',
        name='message_type_enum'
    )
    message_enum.drop(op.get_bind(), checkfirst=True)