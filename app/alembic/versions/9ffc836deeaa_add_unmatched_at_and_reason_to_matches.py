"""add unmatched_at and reason to matches

Revision ID: 9ffc836deeaa
Revises: 9ba5ee19d635
Create Date: 2025-11-06 13:45:02.873263

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9ffc836deeaa'
down_revision: Union[str, Sequence[str], None] = '9ba5ee19d635'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
