"""posts 加 views 列（带 server_default，旧行自动填 0）

Revision ID: 0002
Revises: 0001
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"


def upgrade():
    op.add_column("posts", sa.Column("views", sa.Integer, nullable=False, server_default="0"))


def downgrade():
    op.drop_column("posts", "views")
