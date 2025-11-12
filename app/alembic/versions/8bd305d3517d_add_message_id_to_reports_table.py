"""add message_id to reports table

Revision ID: 8bd305d3517d
Revises: 7e4849bc4723
Create Date: 2025-11-06 10:09:31.872747

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8bd305d3517d'
down_revision: Union[str, Sequence[str], None] = '7e4849bc4723'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
