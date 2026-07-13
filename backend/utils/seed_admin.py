from extensions import db
from models.models import User


def seed_admin(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@placementportal.com',
                role='admin',
                is_active=True,
                is_approved=True
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print('Admin user created: admin / admin123')
            