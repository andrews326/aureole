"""add unmatched_at and reason to matches

Revision ID: 9454a1fff65b
Revises: 9f32bfc6539b
Create Date: 2025-11-08 16:23:54.812391

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9454a1fff65b'
down_revision: Union[str, Sequence[str], None] = '9f32bfc6539b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
