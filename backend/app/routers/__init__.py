# Routers package
from .auth import router as auth_router
from .domaines import router as domaines_router
from .processes import router as processes_router
from .etapes import router as etapes_router, etapes_standalone_router
from .masques import router as masques_router, etape_masques_router
from .services import router as services_router
from .procedures import router as procedures_router
from .tables import router as tables_router
from .attributs import router as attributs_router
from .dcs import router as dcs_router
from .archives import router as archives_router
from .search import router as search_router
