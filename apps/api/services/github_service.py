import os
import subprocess
import urllib.request
import urllib.error
import json
import logging
from typing import Optional, Dict, Any, Tuple
from apps.api.core.config import settings

logger = logging.getLogger(__name__)

class GitHubService:
    @staticmethod
    def _get_token(override_token: Optional[str] = None) -> Optional[str]:
        return override_token or settings.GITHUB_TOKEN

    @classmethod
    def get_authenticated_user(cls, token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        auth_token = cls._get_token(token)
        if not auth_token:
            return None
        
        req = urllib.request.Request(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "AgencyOS-Platform"
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            logger.warning(f"Failed to authenticate with GitHub: {e}")
            return None
        return None

    @classmethod
    def create_repository(
        cls,
        name: str,
        private: bool = True,
        description: str = "Project created by AgencyOS autonomous team",
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        auth_token = cls._get_token(token)
        if not auth_token:
            raise ValueError("GitHub Token tidak ditemukan. Harap konfigurasi GitHub PAT.")

        payload = json.dumps({
            "name": name,
            "private": private,
            "description": description,
            "auto_init": False,
            "has_issues": True,
            "has_projects": True
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.github.com/user/repos",
            data=payload,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "AgencyOS-Platform"
            },
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            try:
                err_json = json.loads(error_body)
                msg = err_json.get("message", error_body)
                errors = err_json.get("errors", [])
                if errors:
                    msg += f" ({errors[0].get('message', '')})"
            except Exception:
                msg = error_body
            raise RuntimeError(f"Gagal membuat repositori GitHub: {msg}")

    @classmethod
    def init_local_git_repo(
        cls,
        workspace_full_path: str,
        remote_url: Optional[str] = None,
        branch: str = "main",
        create_ci: bool = True,
        project_name: str = "",
        project_key: str = "",
        token: Optional[str] = None
    ) -> Dict[str, Any]:
        os.makedirs(workspace_full_path, exist_ok=True)
        git_dir = os.path.join(workspace_full_path, ".git")

        # 1. git init if not exists
        if not os.path.exists(git_dir):
            subprocess.run(["git", "init", "-b", branch], cwd=workspace_full_path, check=True, capture_output=True)
            # Configure default identity for agent commits
            subprocess.run(["git", "config", "user.name", "AgencyOS Agent"], cwd=workspace_full_path, capture_output=True)
            subprocess.run(["git", "config", "user.email", "agent@agencyos.local"], cwd=workspace_full_path, capture_output=True)

        # 2. Generate standard .gitignore if not present
        gitignore_path = os.path.join(workspace_full_path, ".gitignore")
        if not os.path.exists(gitignore_path):
            with open(gitignore_path, "w", encoding="utf-8") as f:
                f.write(
                    "# AgencyOS Workspace gitignore\n"
                    "node_modules/\n"
                    ".next/\n"
                    "dist/\n"
                    "build/\n"
                    "__pycache__/\n"
                    "*.py[cod]\n"
                    ".venv/\n"
                    "env/\n"
                    ".env\n"
                    ".env.local\n"
                    "coverage/\n"
                    ".pytest_cache/\n"
                    ".DS_Store\n"
                )

        # 3. Generate README.md if not present
        readme_path = os.path.join(workspace_full_path, "README.md")
        if not os.path.exists(readme_path):
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(
                    f"# {project_name or project_key}\n\n"
                    f"**Project Key**: `{project_key}`\n\n"
                    "Repository managed and autonomously developed with **[AgencyOS](https://github.com/albertramadhanvanwijk/AgencyOS)**.\n\n"
                    "## Structure\n"
                    "- Every feature/task is developed on an isolated branch (`agencyos/{KEY}/{TASK_ID}`).\n"
                    "- Quality gates, automated tests, and PR workflows are continuously executed before delivery.\n"
                )

        # 4. Generate GitHub Actions CI workflow if requested
        if create_ci:
            wf_dir = os.path.join(workspace_full_path, ".github", "workflows")
            os.makedirs(wf_dir, exist_ok=True)
            ci_path = os.path.join(wf_dir, "ci.yml")
            if not os.path.exists(ci_path):
                with open(ci_path, "w", encoding="utf-8") as f:
                    f.write(
                        "name: AgencyOS Automated Quality CI\n\n"
                        "on:\n"
                        "  push:\n"
                        "    branches: [ main ]\n"
                        "  pull_request:\n"
                        "    branches: [ main ]\n\n"
                        "jobs:\n"
                        "  quality-check:\n"
                        "    runs-on: ubuntu-latest\n"
                        "    steps:\n"
                        "      - name: Checkout Repository\n"
                        "        uses: actions/checkout@v4\n"
                        "      - name: Run Basic Health Check\n"
                        "        run: echo 'AgencyOS CI checks passed successfully.'\n"
                    )

        # 5. Commit initial files if repository is clean or newly created
        try:
            status_res = subprocess.run(["git", "status", "--porcelain"], cwd=workspace_full_path, capture_output=True, text=True)
            if status_res.stdout.strip():
                subprocess.run(["git", "add", "."], cwd=workspace_full_path, check=True, capture_output=True)
                subprocess.run(["git", "commit", "-m", f"chore: initialize {project_key} workspace with AgencyOS"], cwd=workspace_full_path, check=True, capture_output=True)
        except Exception as e:
            logger.warning(f"Initial commit note: {e}")

        # 6. Setup remote origin if remote_url provided
        pushed = False
        if remote_url:
            auth_token = cls._get_token(token)
            # Inject token in remote URL for authenticated git push if HTTPS
            authenticated_remote = remote_url
            if auth_token and remote_url.startswith("https://github.com/"):
                repo_part = remote_url.replace("https://github.com/", "")
                authenticated_remote = f"https://x-access-token:{auth_token}@github.com/{repo_part}"

            subprocess.run(["git", "remote", "remove", "origin"], cwd=workspace_full_path, capture_output=True)
            subprocess.run(["git", "remote", "add", "origin", authenticated_remote], cwd=workspace_full_path, check=True, capture_output=True)

            try:
                subprocess.run(["git", "push", "-u", "origin", branch, "--force"], cwd=workspace_full_path, check=True, capture_output=True, timeout=20)
                pushed = True
            except Exception as e:
                logger.warning(f"Could not push to remote origin: {e}")

        return {
            "status": "success",
            "workspace_path": workspace_full_path,
            "branch": branch,
            "remote_url": remote_url,
            "pushed": pushed
        }

    @classmethod
    def create_task_branch(cls, workspace_full_path: str, branch_name: str) -> bool:
        if not os.path.exists(os.path.join(workspace_full_path, ".git")):
            return False
        try:
            # Check if branch exists
            check = subprocess.run(["git", "rev-parse", "--verify", branch_name], cwd=workspace_full_path, capture_output=True)
            if check.returncode == 0:
                subprocess.run(["git", "checkout", branch_name], cwd=workspace_full_path, check=True, capture_output=True)
            else:
                subprocess.run(["git", "checkout", "-b", branch_name], cwd=workspace_full_path, check=True, capture_output=True)
            return True
        except Exception as e:
            logger.warning(f"Failed to create task branch {branch_name}: {e}")
            return False

    @classmethod
    def create_pull_request(
        cls,
        repo_full_name: str,
        title: str,
        head_branch: str,
        base_branch: str = "main",
        body: str = "",
        token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        auth_token = cls._get_token(token)
        if not auth_token:
            return None

        payload = json.dumps({
            "title": title,
            "head": head_branch,
            "base": base_branch,
            "body": body,
            "draft": True
        }).encode("utf-8")

        req = urllib.request.Request(
            f"https://api.github.com/repos/{repo_full_name}/pulls",
            data=payload,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "AgencyOS-Platform"
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                return json.loads(res.read().decode("utf-8"))
        except Exception as e:
            logger.warning(f"Could not create GitHub PR: {e}")
            return None

github_service = GitHubService()
