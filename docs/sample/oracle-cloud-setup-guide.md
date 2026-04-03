# Oracle Cloud Free Tier 완전 운영 가이드
## 계정 개설 → 인프라 구성 → OpenClaw · brewnet · tika 배포

> **작성 기준**: Oracle Cloud Free Tier (2025–2026), Ubuntu 22.04 LTS, OpenClaw (github.com/openclaw/openclaw)  
> **대상 스펙**: ARM Ampere A1 4 OCPU / 24 GB RAM, AMD x86 VM ×2 (각 1 GB), 블록 스토리지 200 GB

---

## 목차

1. [Oracle Cloud Free Tier 스펙 정리](#1-oracle-cloud-free-tier-스펙-정리)
2. [인프라 설계 전략](#2-인프라-설계-전략)
3. [계정 개설 (가입 단계별 안내)](#3-계정-개설-가입-단계별-안내)
4. [가입 트러블슈팅](#4-가입-트러블슈팅)
5. [OCI 콘솔 — VCN · 서브넷 · 보안 그룹 설정](#5-oci-콘솔--vcn--서브넷--보안-그룹-설정)
6. [인스턴스 생성 (ARM A1 · AMD)](#6-인스턴스-생성-arm-a1--amd)
7. [인스턴스 생성 트러블슈팅 (Out of Capacity)](#7-인스턴스-생성-트러블슈팅-out-of-capacity)
8. [SSH 접속 설정](#8-ssh-접속-설정)
9. [서버 공통 초기 세팅](#9-서버-공통-초기-세팅)
10. [VM1 (ARM) — OpenClaw 설치 (Docker 격리)](#10-vm1-arm--openclaw-설치-docker-격리)
11. [VM2 (ARM) — brewnet 배포](#11-vm2-arm--brewnet-배포)
12. [VM2 (ARM) — tika 배포](#12-vm2-arm--tika-배포)
13. [도메인 구매 및 DNS 설정](#13-도메인-구매-및-dns-설정)
14. [Nginx 리버스 프록시 & SSL (Let's Encrypt)](#14-nginx-리버스-프록시--ssl-lets-encrypt)
15. [모니터링 & 운영 팁](#15-모니터링--운영-팁)
16. [요약 체크리스트](#16-요약-체크리스트)

---

## 1. Oracle Cloud Free Tier 스펙 정리

| 카테고리 | 리소스 | 상세 |
|---|---|---|
| **컴퓨트** | AMD x86 VM | 2개, 각 1/8 OCPU · 1 GB RAM |
| **컴퓨트** | ARM Ampere A1 | **총 4 OCPU · 24 GB RAM** (VM 1–4개로 분할 가능) |
| **스토리지** | 블록 볼륨 | 2개, 합계 200 GB |
| **스토리지** | 오브젝트 스토리지 | 표준 10 GB + 비정기 접속 10 GB + 아카이브 10 GB |
| **네트워크** | 아웃바운드 | 월 10 TB |
| **네트워크** | 로드밸런서 | 유연형 1개 (10 Mbps) |
| **네트워크** | VCN | 최대 2개 (IPv4 · IPv6) |
| **DB** | Autonomous DB | 2개 (각 1 OCPU · 20 GB) |
| **고정 IP** | 예약 공인 IP | **계정당 1개** 무료 |

> ⚠️ **고정 IP 주의**: ARM VM 2개를 사용하면 1개만 고정 IP가 무료. 나머지는 임시 공인 IP(재부팅 시 변경).  
> 도메인이 있다면 IP 변경 대응을 위한 DDNS 설정을 고려하세요.

---

## 2. 인프라 설계 전략

### 2.1 권장 VM 분할 방식

```
┌─────────────────────────────────────────────────────────────────┐
│  Oracle Cloud Free Tier                                          │
│                                                                  │
│  ┌────────────────────────────┐  ┌────────────────────────────┐  │
│  │  VM1 (ARM A1)              │  │  VM2 (ARM A1)              │  │
│  │  2 OCPU · 12 GB RAM       │  │  2 OCPU · 12 GB RAM       │  │
│  │  100 GB Block Volume       │  │  100 GB Block Volume       │  │
│  │                            │  │                            │  │
│  │  [Docker]                  │  │  brewnet (Node.js/etc.)    │  │
│  │   └─ OpenClaw Gateway      │  │  tika (Apache Tika)        │  │
│  │       Port: 18789          │  │  Nginx + SSL               │  │
│  │  Nginx (리버스 프록시)     │  │                            │  │
│  │  고정 공인 IP ← 권장       │  │  임시 공인 IP              │  │
│  └────────────────────────────┘  └────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                  │
│  │  AMD VM1           │  │  AMD VM2           │                  │
│  │  1/8 OCPU · 1 GB  │  │  1/8 OCPU · 1 GB  │                  │
│  │  (모니터링/경량)   │  │  (예비/테스트)     │                  │
│  └────────────────────┘  └────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 OpenClaw Docker 격리 이유

- OpenClaw는 `bash` tool, 브라우저 제어, AI 에이전트 기능을 제공하므로 **호스트 시스템 보안 분리가 필수**
- 공식 레포에 `Dockerfile`, `docker-compose.yml`, `Dockerfile.sandbox` 존재 → Docker 배포가 공식 지원
- 같은 VM에서 운영 시 `agents.defaults.sandbox.mode: "non-main"` 설정으로 그룹/채널 세션을 Docker 샌드박스로 격리 가능
- VM을 분리하면 격리가 자연스럽게 해결되므로 **VM 분리를 권장**

---

## 3. 계정 개설 (가입 단계별 안내)

### 3.1 사전 준비물

- **해외 결제 가능 신용카드 또는 직불카드** (반드시 해외 결제 활성화 필요)
  - 선불카드, 가상카드 불가
  - VISA / Mastercard 권장
  - 카드에 영문 이름이 인쇄된 것 사용
- 전용 이메일 주소 (가입 계정당 1개)
- 전화번호 (SMS 인증)

### 3.2 가입 단계

**Step 1 — 가입 페이지 접속**

```
https://www.oracle.com/kr/cloud/free/
```

`무료로 시작하기` 버튼 클릭

**Step 2 — 기본 계정 정보 입력**

| 필드 | 입력 방법 |
|---|---|
| 국가/지역 | **대한민국** 선택 |
| 이름 / 성 | **카드에 인쇄된 영문 이름** 그대로 입력 |
| 이메일 | 본인 이메일 (네이버, Gmail 모두 가능) |
| 클라우드 계정 이름 | 소문자 영문, 숫자 조합 (예: `myociaccount`) |

> ⚠️ 이름을 한글로 입력하면 트랜잭션 오류 발생 확률 급증. **반드시 카드 영문명과 일치**시킬 것.

**Step 3 — 이메일 인증**

입력한 이메일로 인증 코드가 발송됨. 15분 내 입력.

**Step 4 — 비밀번호 설정**

- 대문자 1개 이상, 소문자 1개 이상, 숫자 1개 이상, 특수문자 1개 이상
- 12자 이상 권장

**Step 5 — 주소 입력**

- 실제 거주 주소 입력 (영문 주소)
- 주소 변환 도구: https://www.juseng.co.kr 또는 네이버 지도 영문 주소 사용

**Step 6 — 전화번호 인증**

- 국가 코드: `+82` (대한민국)
- 전화번호: 앞의 `0` 제거 후 입력 (예: `1012345678`)
- SMS 코드 입력

**Step 7 — 결제 정보 입력 (카드 등록)**

> 이 단계가 가장 많이 실패합니다. [섹션 4 트러블슈팅](#4-가입-트러블슈팅) 먼저 읽기 권장

- 카드 번호, 만료일, CVC 입력
- 청구지 주소: 5단계에서 입력한 주소와 동일하게 입력
- $0~1 임시 승인 후 자동 취소됨 (실제 청구 없음)

**Step 8 — 계약 동의 및 가입 완료**

`내 무료 체험판 시작하기` 클릭 → 계정 생성에 최대 15분 소요

---

## 4. 가입 트러블슈팅

### 4.1 `트랜잭션을 처리하는 중 오류 발생` (결제 오류)

가장 빈번한 문제. 아래 체크리스트 순서대로 시도:

**원인 1: 해외원화결제(DCC) 차단**

```
해결: 카드사 앱 또는 고객센터에서
     "해외 결제 허용" 또는 "해외원화결제 차단 해제" 설정
     
확인 방법: 카드사 앱 → 카드 관리 → 해외결제 설정
```

**원인 2: 이름 불일치**

```
해결: 성(Last Name)/이름(First Name) 순서 확인
     카드 인쇄 이름과 정확히 일치시킬 것
     예) 카드: "GILDONG HONG" → 이름: GILDONG, 성: HONG
```

**원인 3: VPN / 프록시 사용 중**

```
해결: VPN 완전 종료 후 재시도
     브라우저 캐시/쿠키 삭제 후 시크릿 모드로 재시도
```

**원인 4: 동일 IP에서 여러 번 시도**

```
해결: 모바일 데이터(LTE/5G)로 전환 후 재시도
     또는 공유기 재부팅으로 공인 IP 변경
```

**원인 5: 선불카드 / 가상카드 사용**

```
해결: 실물 신용카드 또는 체크카드(직불카드) 사용
     토스카드, 카카오페이카드 등 가상카드 불가
     KB, 신한, 현대, 삼성 등 주요 은행 실물 카드 권장
```

**그래도 안 된다면 — Oracle 라이브 채팅 문의**

```
접속: https://www.oracle.com/kr/cloud/free/ 우측 하단 채팅 아이콘
내용 예시:
  "I'm trying to register for Oracle Cloud Free Tier 
   but getting a payment transaction error. 
   My name: [영문 이름], Email: [이메일]
   Please help me complete the registration."
```

> 라이브 채팅은 이메일보다 빠르게 처리됨. 보통 수분 내 상담원 연결.

---

### 4.2 `계정 리뷰 보류 (Account Under Review)`

가입 직후 또는 수일 내 이메일로 `Your account is under review` 수신.

```
원인: Oracle의 자동 사기 방지 시스템이 계정을 보류 처리

해결:
1. 48시간 대기 (자동 해제되는 경우 있음)
2. 가입 시 입력한 이메일로 답장:
   제목: Re: Oracle Cloud Account Review
   내용: "I submitted my registration for Oracle Cloud Free Tier.
          I am a developer/student and intend to use it for [용도].
          Please review and activate my account."
3. Oracle 라이브 채팅으로 직접 요청
```

---

### 4.3 홈 리전(Home Region) 선택 주의

- 가입 시 선택한 홈 리전은 **변경 불가**
- ARM A1 인스턴스 가용성 문제로 **서울(ap-seoul-1)보다 춘천(ap-chuncheon-1)** 이 ARM 인스턴스 생성에 유리한 경우 있음
- 서울이 더 낮은 레이턴시이나 capacity 문제로 생성 실패 빈번

> **권장**: 홈 리전을 `ap-chuncheon-1` (한국 중부 - 춘천) 으로 선택

---

## 5. OCI 콘솔 — VCN · 서브넷 · 보안 그룹 설정

### 5.1 VCN 생성

```
OCI 콘솔 로그인 → 햄버거 메뉴 → 네트워킹 → 가상 클라우드 네트워크
→ VCN 마법사 시작 → "인터넷 연결이 포함된 VCN 생성" 선택
```

| 설정 | 값 |
|---|---|
| VCN 이름 | `my-vcn` |
| VCN CIDR 블록 | `10.0.0.0/16` |
| 공용 서브넷 CIDR | `10.0.0.0/24` |
| 전용 서브넷 CIDR | `10.0.1.0/24` |

`다음` → `생성` 클릭

### 5.2 보안 목록 (방화벽 인바운드 규칙) 추가

```
네트워킹 → 가상 클라우드 네트워크 → [VCN 선택]
→ 보안 목록 → Default Security List → 수신 규칙 추가
```

아래 포트를 추가:

| 포트 | 용도 | 소스 CIDR |
|---|---|---|
| 22 | SSH | `0.0.0.0/0` (기본 존재) |
| 80 | HTTP (Nginx) | `0.0.0.0/0` |
| 443 | HTTPS (Nginx + SSL) | `0.0.0.0/0` |
| 18789 | OpenClaw Gateway | `0.0.0.0/0` |
| 9998 | Apache Tika | `10.0.0.0/16` (내부만) |

> **보안 팁**: Tika 포트는 내부 서브넷만 허용. OpenClaw 18789도 실제 운영 시 내부만 허용하고 Nginx로 프록시 권장.

### 5.3 각 인스턴스 OS 방화벽 (iptables) 동기화

OCI 보안 목록 설정만으로는 부족. 인스턴스 내부 `iptables`도 허용해야 함.  
*(섹션 9에서 자동 처리)*

---

## 6. 인스턴스 생성 (ARM A1 · AMD)

### 6.1 VM1 — ARM A1 (OpenClaw 전용, 2 OCPU · 12 GB)

```
컴퓨트 → 인스턴스 → 인스턴스 생성
```

| 항목 | 설정 값 |
|---|---|
| 이름 | `vm1-openclaw` |
| 배치 | 가용성 도메인 1 |
| 이미지 | **Canonical Ubuntu 22.04 (aarch64)** |
| Shape | **VM.Standard.A1.Flex** |
| OCPU | **2** |
| 메모리 | **12 GB** |
| 네트워킹 | 위에서 생성한 VCN, 공용 서브넷 |
| 공용 IPv4 주소 | **예약된 공인 IP 할당** (고정 IP) |
| SSH 키 | 새 키 쌍 생성 → 개인 키 다운로드 (`vm1-key.key`) |
| 부트 볼륨 | **100 GB** |

`생성` 클릭

### 6.2 VM2 — ARM A1 (brewnet + tika, 2 OCPU · 12 GB)

| 항목 | 설정 값 |
|---|---|
| 이름 | `vm2-services` |
| Shape | **VM.Standard.A1.Flex** |
| OCPU | **2** |
| 메모리 | **12 GB** |
| 공용 IPv4 주소 | 임시 공인 IP (고정 IP 무료 1개를 VM1에 할당했으므로) |
| SSH 키 | 새 키 쌍 또는 VM1과 동일 키 |
| 부트 볼륨 | **100 GB** |

### 6.3 AMD VM (선택 — 모니터링 또는 경량 작업)

| 항목 | 설정 값 |
|---|---|
| Shape | **VM.Standard.E2.1.Micro** |
| OCPU | 1/8 |
| 메모리 | 1 GB |
| 이미지 | Ubuntu 22.04 (x86_64) |

> AMD VM은 RAM 1GB로 매우 제한적. 별도 서비스 운영보다 포트포워딩, 모니터링, Bastion 용도에 적합.

---

## 7. 인스턴스 생성 트러블슈팅 (Out of Capacity)

### 문제: `Out of host capacity`

ARM A1 인스턴스 생성 시 빈번히 발생하는 오류. 특히 서울 리전.

```
오류 메시지: "Out of host capacity. Please retry your request later."
```

**원인**: Oracle이 무료 계정의 ARM 인스턴스 생성 수를 특정 리전에서 제한

**해결 방법 1: 다른 가용성 도메인(AD) 시도**

```
생성 시 → 배치 → 가용성 도메인을 AD-1, AD-2, AD-3 순서로 각각 시도
```

**해결 방법 2: OCPU를 1개씩 줄여서 시도**

```
처음: 4 OCPU, 24GB → 실패 시 2 OCPU, 12GB → 실패 시 1 OCPU, 6GB 로 생성 후 나중에 수정
```

**해결 방법 3: 자동 재시도 스크립트 (OCI CLI 활용)**

OCI CLI 설치 후 아래 스크립트로 주기적으로 시도:

```bash
#!/bin/bash
# retry-create-instance.sh
# OCI CLI 설치 필요: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm

COMPARTMENT_ID="<your-compartment-ocid>"
SUBNET_ID="<your-subnet-ocid>"
IMAGE_ID="<ubuntu-22.04-arm-image-ocid>"   # OCI 콘솔에서 확인
SSH_KEY_FILE="~/.ssh/id_rsa.pub"

while true; do
  echo "[$(date)] ARM 인스턴스 생성 시도 중..."
  
  RESULT=$(oci compute instance launch \
    --availability-domain "AD-1" \
    --compartment-id "$COMPARTMENT_ID" \
    --shape "VM.Standard.A1.Flex" \
    --shape-config '{"ocpus": 2, "memoryInGBs": 12}' \
    --image-id "$IMAGE_ID" \
    --subnet-id "$SUBNET_ID" \
    --display-name "vm1-openclaw" \
    --assign-public-ip true \
    --ssh-authorized-keys-file "$SSH_KEY_FILE" \
    2>&1)
  
  if echo "$RESULT" | grep -q '"lifecycleState"'; then
    echo "생성 성공!"
    echo "$RESULT"
    break
  fi
  
  echo "실패. 60초 후 재시도..."
  sleep 60
done
```

```bash
chmod +x retry-create-instance.sh
./retry-create-instance.sh
```

> 보통 몇 시간 내로 성공. 자동화 없이 수동으로는 매우 어려움.

**해결 방법 4: 리전 변경 (재가입 없이 불가)**

현재 홈 리전이 서울이라면 춘천으로는 변경 불가. 춘천 계정을 새로 만드는 것이 유일한 방법.

---

## 8. SSH 접속 설정

### 8.1 로컬 머신에서 키 권한 설정

```bash
# 다운로드한 키 파일 권한 설정 (필수 — 없으면 접속 거부)
chmod 400 vm1-key.key
chmod 400 vm2-key.key
```

### 8.2 SSH 접속

```bash
# VM1 접속 (ARM — OpenClaw)
ssh -i vm1-key.key ubuntu@<VM1_PUBLIC_IP>

# VM2 접속 (ARM — services)
ssh -i vm2-key.key ubuntu@<VM2_PUBLIC_IP>
```

### 8.3 ~/.ssh/config 설정 (편의를 위해)

로컬의 `~/.ssh/config` 파일에 추가:

```
Host oci-openclaw
    HostName <VM1_PUBLIC_IP>
    User ubuntu
    IdentityFile ~/Downloads/vm1-key.key
    ServerAliveInterval 60
    ServerAliveCountMax 10

Host oci-services
    HostName <VM2_PUBLIC_IP>
    User ubuntu
    IdentityFile ~/Downloads/vm2-key.key
    ServerAliveInterval 60
    ServerAliveCountMax 10
```

이후 접속:

```bash
ssh oci-openclaw
ssh oci-services
```

---

## 9. 서버 공통 초기 세팅

**VM1, VM2 양쪽 모두 동일하게 실행**

### 9.1 시스템 업데이트

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim htop unzip net-tools
```

### 9.2 타임존 설정

```bash
sudo timedatectl set-timezone Asia/Seoul
timedatectl status
```

### 9.3 OCI 내부 방화벽 (iptables) 포트 허용

Oracle Cloud VM은 기본적으로 iptables가 활성화되어 있어 OCI 콘솔 보안 목록만으론 부족:

```bash
# HTTP, HTTPS 허용
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
# OpenClaw Gateway (VM1에서만)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 18789 -j ACCEPT

# 규칙 영구 저장
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
sudo netfilter-persistent reload
```

### 9.4 스왑 메모리 설정 (ARM VM — 4GB)

ARM 12GB VM은 충분하지만 빌드 중 OOM 방지를 위해 설정:

```bash
# 기존 스왑 비활성화
sudo swapoff -a

# 4GB 스왑 파일 생성
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 부팅 시 자동 마운트
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 확인
free -h
```

### 9.5 Docker 설치

```bash
# 기존 구버전 제거
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Docker 공식 GPG 키 및 레포 추가
sudo apt install -y ca-certificates gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# ubuntu 사용자에게 Docker 권한 부여 (재로그인 필요)
sudo usermod -aG docker ubuntu

# 서비스 시작
sudo systemctl enable docker
sudo systemctl start docker

# 확인 (재로그인 후)
docker --version
```

> `docker --version` 확인 전 `exit` 후 재접속 필요 (그룹 권한 적용)

---

## 10. VM1 (ARM) — OpenClaw 설치 (Docker 격리)

> **참고**: OpenClaw 공식 문서: https://docs.openclaw.ai  
> **공식 GitHub**: https://github.com/openclaw/openclaw  
> **Node.js 최소 요구**: Node ≥ 22

### 10.1 Node.js 설치 (v22)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v22.x.x 확인
npm --version
```

### 10.2 pnpm 설치

```bash
sudo npm install -g pnpm
pnpm --version
```

### 10.3 OpenClaw 설치 (npm 글로벌)

```bash
# NODE_OPTIONS: 12GB RAM 환경에서 힙 메모리 충분히 확보
export NODE_OPTIONS="--max-old-space-size=4096"

# ~/.bashrc에 영구 등록
echo 'export NODE_OPTIONS="--max-old-space-size=4096"' >> ~/.bashrc
source ~/.bashrc

# OpenClaw 글로벌 설치
npm install -g openclaw@latest
openclaw --version
```

### 10.4 빌드 스크립트 승인 (설치 중 경고 발생 시)

```bash
# Ignored build scripts 경고 발생 시 실행
cd ~/.npm-global/lib/node_modules/openclaw  # 경로는 npm root -g 로 확인
pnpm approve-builds
pnpm install
```

### 10.5 Docker Compose로 OpenClaw 실행 (권장)

공식 레포의 `docker-compose.yml` 활용:

```bash
mkdir -p ~/openclaw-deploy && cd ~/openclaw-deploy

# 공식 docker-compose.yml 다운로드
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw/main/docker-compose.yml \
  -o docker-compose.yml

# 환경 변수 파일 생성
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw/main/.env.example \
  -o .env
```

`.env` 파일 편집:

```bash
vim .env
```

최소 설정 예시 (`~/.openclaw/openclaw.json` 또는 환경 변수로도 설정 가능):

```bash
# .env 파일 내용 예시
OPENCLAW_PORT=18789
# Telegram 봇 토큰 (텔레그램 연동 시)
# TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
# OpenAI API 키 (Claude, Gemini 등 모델 설정은 openclaw.json에서)
```

**OpenClaw 설정 파일 생성**:

```bash
mkdir -p ~/.openclaw

cat > ~/.openclaw/openclaw.json << 'EOF'
{
  "agent": {
    "model": "anthropic/claude-opus-4-6"
  },
  "gateway": {
    "port": 18789,
    "bind": "lan"
  },
  "channels": {
    "telegram": {
      "botToken": "여기에_텔레그램_봇_토큰_입력"
    }
  }
}
EOF
```

> `"bind": "lan"` 설정이 필수. `loopback`이면 외부 접근 불가.

**Docker Compose 실행**:

```bash
cd ~/openclaw-deploy
docker compose up -d

# 로그 확인
docker compose logs -f
```

### 10.6 네이티브 설치 + Systemd 서비스 등록 (Docker 미사용 시)

Docker 대신 네이티브 설치 시:

```bash
# 온보딩 및 데몬 설치
openclaw onboard --install-daemon

# Linger 설정: SSH 종료 후에도 백그라운드 유지
sudo loginctl enable-linger ubuntu

# 서비스 시작
systemctl --user start openclaw-gateway
systemctl --user enable openclaw-gateway

# 상태 확인
systemctl --user status openclaw-gateway

# 실시간 로그
journalctl --user -u openclaw-gateway -f
```

### 10.7 텔레그램 연동

```bash
# 서비스 실행 후 페어링 코드 확인
systemctl --user status openclaw-gateway
# 또는 Docker 로그에서 텔레그램 봇으로부터 코드 수신

# 페어링 승인
openclaw pairing approve telegram <수신된_코드>
```

**텔레그램 연동 트러블슈팅**:

```bash
# [telegram] getUpdates conflict 오류 발생 시
# 중복 세션 종료 후 재시작
sudo pkill -9 node
systemctl --user restart openclaw-gateway
```

### 10.8 OpenClaw 동작 확인

```bash
# 상태 확인
openclaw doctor

# 메시지 전송 테스트
openclaw agent --message "Hello from OCI server"
```

---

## 11. VM2 (ARM) — brewnet 배포

> brewnet 프로젝트의 기술 스택 (Node.js 기준 예시)에 맞게 조정하세요.

### 11.1 Node.js 설치 (VM1과 동일)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
export NODE_OPTIONS="--max-old-space-size=4096"
echo 'export NODE_OPTIONS="--max-old-space-size=4096"' >> ~/.bashrc
```

### 11.2 프로젝트 배포 (예: GitHub 기반)

```bash
mkdir -p ~/apps && cd ~/apps

# 프로젝트 클론
git clone https://github.com/<your-org>/brewnet.git
cd brewnet

# 의존성 설치
npm install --production
# 또는
pnpm install --prod
```

### 11.3 환경 변수 설정

```bash
cp .env.example .env
vim .env
# 필요한 환경 변수 입력 (DB 연결, API 키 등)
```

### 11.4 Systemd 서비스 등록

```bash
sudo tee /etc/systemd/system/brewnet.service > /dev/null << 'EOF'
[Unit]
Description=brewnet Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/apps/brewnet
ExecStart=/usr/bin/node /home/ubuntu/apps/brewnet/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=4096
EnvironmentFile=/home/ubuntu/apps/brewnet/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable brewnet
sudo systemctl start brewnet
sudo systemctl status brewnet
```

### 11.5 릴리즈 배포 스크립트

```bash
cat > ~/deploy-brewnet.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="/home/ubuntu/apps/brewnet"
BRANCH="${1:-main}"

echo "=== brewnet 배포 시작 (branch: $BRANCH) ==="

cd "$APP_DIR"

# 코드 업데이트
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# 의존성 업데이트
npm install --production

# 서비스 재시작
sudo systemctl restart brewnet
sudo systemctl status brewnet --no-pager

echo "=== 배포 완료 ==="
EOF

chmod +x ~/deploy-brewnet.sh

# 사용법
# ./deploy-brewnet.sh          # main 브랜치
# ./deploy-brewnet.sh release  # release 브랜치
```

---

## 12. VM2 (ARM) — tika 배포

Apache Tika는 Java 기반. ARM Ubuntu에서 Docker로 실행하는 것이 가장 안정적.

### 12.1 Java 설치 (네이티브 실행 시)

```bash
sudo apt install -y openjdk-21-jre-headless
java -version
```

### 12.2 Apache Tika Server Docker 배포 (권장)

```bash
mkdir -p ~/tika && cd ~/tika

cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  tika:
    image: apache/tika:latest-full
    platform: linux/arm64
    container_name: tika-server
    ports:
      - "127.0.0.1:9998:9998"
    restart: unless-stopped
    environment:
      - JAVA_OPTS=-Xms512m -Xmx2g
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9998/tika"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF

docker compose up -d
```

> **포트 바인딩 `127.0.0.1:9998`**: Tika는 외부에 직접 노출하지 않고 localhost에만 바인딩. brewnet에서 내부망(`10.0.0.x:9998`)으로 접근하거나 같은 VM이라면 localhost로 접근.

### 12.3 Tika 동작 확인

```bash
# 서비스 상태 확인
curl http://localhost:9998/tika

# 텍스트 추출 테스트
echo "Hello Tika Test" > /tmp/test.txt
curl -T /tmp/test.txt http://localhost:9998/tika --header "Content-Type: text/plain"
```

### 12.4 Tika Systemd 서비스 (Docker Compose)

```bash
sudo tee /etc/systemd/system/tika.service > /dev/null << 'EOF'
[Unit]
Description=Apache Tika Server (Docker)
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/tika
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=ubuntu

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tika
sudo systemctl start tika
```

---

## 13. 도메인 구매 및 DNS 설정

서비스를 실제 도메인으로 운영하려면 도메인 구매 → DNS 레코드 등록 → (선택) Cloudflare 연동 순서로 진행합니다.  
SSL 인증서(Let's Encrypt)는 도메인이 서버 IP에 올바르게 연결된 이후에만 발급됩니다.

---

### 13.1 도메인 구매처 비교

| 구매처 | 특징 | .com 연간 가격 (2026 기준) | 국가 도메인(.kr) |
|---|---|---|---|
| **[가비아](https://www.gabia.com)** | 국내 점유율 1위, 한국어 지원 완벽 | 약 ₩17,000 | ✅ 지원 |
| **[호스팅케이알](https://www.hosting.kr)** | 국내 업체, 가성비 | 약 ₩15,000 | ✅ 지원 |
| **[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)** | 원가 판매(마진 없음), DNS 관리 일원화 | 약 $9–11 (₩12,000 내외) | ❌ 미지원 (.com/.net/.org 위주) |
| **[Namecheap](https://www.namecheap.com)** | 영문 서비스, 저렴 | 약 $10–12 | ❌ 미지원 |

> **권장**: `.com` 도메인이면 Cloudflare Registrar (가장 저렴 + DNS 관리 통합).  
> `.kr` 또는 `.co.kr`이 필요하면 가비아에서 구매 후 Cloudflare에 네임서버를 위임.

---

### 13.2 DNS 연결 방법 2가지

#### 방법 A — 도메인 등록사에서 직접 A 레코드 설정 (간단)

도메인 등록사(가비아 등) 관리 페이지에서 직접 A 레코드를 입력하는 방식.

```
가비아 기준: 로그인 → My가비아 → 도메인 관리 → DNS 정보 → DNS 관리
→ 레코드 추가
```

추가할 레코드:

| 타입 | 호스트 | 값 (IP) | TTL |
|---|---|---|---|
| A | `@` | VM1 공인 IP (고정) | 300 |
| A | `www` | VM1 공인 IP (고정) | 300 |
| A | `openclaw` | VM1 공인 IP | 300 |
| A | `brewnet` | VM2 공인 IP | 300 |

> ⚠️ **VM2는 임시 IP**: 재부팅 시 IP가 바뀝니다. 방법 B의 Cloudflare DDNS 또는 Cloudflare Tunnel 사용을 권장합니다.

---

#### 방법 B — Cloudflare로 DNS 위임 (권장)

Cloudflare의 무료 플랜으로 DNS 관리, DDoS 방어, 자동 SSL 프록시, 빠른 전파 속도를 모두 얻을 수 있습니다.

**Step 1 — Cloudflare 계정 생성**

```
https://www.cloudflare.com → Sign Up (무료)
```

**Step 2 — 사이트(도메인) 추가**

```
Cloudflare 대시보드 → 사이트 추가 → 도메인 입력 → Free 플랜 선택
```

Cloudflare가 기존 DNS 레코드를 자동으로 스캔합니다. 계속 진행하면 Cloudflare 네임서버 2개를 제공합니다:

```
예시:
  aria.ns.cloudflare.com
  boris.ns.cloudflare.com
```

**Step 3 — 도메인 등록사에서 네임서버 변경**

```
가비아: My가비아 → 도메인 관리 → [도메인 클릭] → 네임서버 변경
  → 1차: aria.ns.cloudflare.com
  → 2차: boris.ns.cloudflare.com
  (Cloudflare가 제공한 실제 값으로 교체)
```

> 네임서버 전파에 최대 24~48시간 소요. 보통 30분~2시간 내 적용됨.

**Step 4 — Cloudflare DNS 레코드 설정**

```
Cloudflare 대시보드 → [도메인 선택] → DNS → 레코드 → 레코드 추가
```

| 유형 | 이름 | 콘텐츠(IP) | 프록시 상태 |
|---|---|---|---|
| A | `@` (루트 도메인) | VM1 공인 IP | DNS 전용 (🌥 회색) |
| A | `www` | VM1 공인 IP | DNS 전용 (🌥 회색) |
| A | `openclaw` | VM1 공인 IP | DNS 전용 (🌥 회색) |
| A | `brewnet` | VM2 공인 IP | DNS 전용 (🌥 회색) |

> **프록시 상태(🟠 주황 구름) vs DNS 전용(🌥 회색)**:  
> - **DNS 전용**: 실제 서버 IP로 직접 연결. Let's Encrypt SSL 발급에 필요. **처음엔 이 설정 사용**.  
> - **프록시(Proxied)**: Cloudflare를 통해 트래픽 경유, 오리진 IP 숨김, DDoS 방어, 자동 HTTPS. SSL 발급 후 원하면 활성화.
>
> ⚠️ Certbot(Let's Encrypt)으로 SSL을 발급할 때는 반드시 **DNS 전용** 상태여야 함. 프록시 상태에서는 발급 실패.

---

### 13.3 VM2 동적 IP 문제 해결 (DDNS)

VM2에는 고정 IP가 없으므로 재부팅 시 IP가 바뀝니다. 두 가지 해결책 중 하나를 선택하세요.

#### 해결책 1: Cloudflare DDNS 스크립트 (VM2에서 실행)

Cloudflare API를 통해 IP가 바뀔 때마다 DNS 레코드를 자동 업데이트:

```bash
# Cloudflare API 토큰 발급
# Cloudflare 대시보드 → 내 프로필 → API 토큰 → 토큰 생성
# → "DNS 편집" 권한 선택 → 해당 도메인만 적용

# DDNS 업데이트 스크립트 작성
cat > ~/cloudflare-ddns.sh << 'EOF'
#!/bin/bash

# ========= 설정 =========
CF_API_TOKEN="여기에_Cloudflare_API_토큰_입력"
CF_ZONE_ID="여기에_Zone_ID_입력"       # Cloudflare 대시보드 → 도메인 → 오른쪽 하단 Zone ID
CF_RECORD_NAME="brewnet.yourdomain.com"  # 업데이트할 서브도메인
# ========================

# 현재 공인 IP 조회
CURRENT_IP=$(curl -s https://api.ipify.org)

if [ -z "$CURRENT_IP" ]; then
  echo "[$(date)] IP 조회 실패" && exit 1
fi

# Cloudflare에 등록된 현재 레코드 ID + IP 조회
RECORD=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?type=A&name=${CF_RECORD_NAME}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json")

RECORD_ID=$(echo "$RECORD" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
RECORD_IP=$(echo "$RECORD" | grep -o '"content":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$CURRENT_IP" = "$RECORD_IP" ]; then
  echo "[$(date)] IP 변경 없음 ($CURRENT_IP)" && exit 0
fi

# 레코드 업데이트
curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"A\",\"name\":\"${CF_RECORD_NAME}\",\"content\":\"${CURRENT_IP}\",\"ttl\":60,\"proxied\":false}"

echo "[$(date)] DNS 업데이트 완료: ${RECORD_IP} → ${CURRENT_IP}"
EOF

chmod +x ~/cloudflare-ddns.sh

# crontab에 5분마다 실행 등록
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ubuntu/cloudflare-ddns.sh >> /home/ubuntu/ddns.log 2>&1") | crontab -

# 즉시 테스트
./cloudflare-ddns.sh
```

#### 해결책 2: OCI 예약 공인 IP 추가 발급 (유료 — 월 약 $0.7)

무료 계정에서 고정 IP는 1개만 무료이지만, 추가 예약 IP는 소액 요금이 발생합니다.

```
OCI 콘솔 → 네트워킹 → IP 관리 → 예약된 공용 IP → 예약된 공용 IP 생성
→ VM2 인스턴스 VNIC에 연결
```

---

### 13.4 DNS 전파 확인

도메인이 올바른 IP를 가리키는지 확인:

```bash
# dig로 DNS 조회 (서버에서 실행)
sudo apt install -y dnsutils

dig +short openclaw.yourdomain.com     # VM1 IP가 출력되면 성공
dig +short brewnet.yourdomain.com      # VM2 IP가 출력되면 성공

# nslookup으로 확인
nslookup openclaw.yourdomain.com

# 외부 DNS 전파 확인 (온라인 도구)
# https://dnschecker.org 에서 도메인 입력 → 전 세계 DNS 전파 현황 확인
```

> DNS 전파 소요 시간: 도메인 등록사 직접 설정 시 1~12시간, Cloudflare 경유 시 보통 5분 이내.

---

### 13.5 OCI 내장 DNS Zone 활용 (선택 — 도메인 없이 테스트 시)

도메인 구매 전에 OCI DNS Zone을 활용해 내부 테스트를 진행할 수 있습니다.

```
OCI 콘솔 → 네트워킹 → DNS 관리 → DNS 영역 → 영역 생성
→ 기본 영역, 영역 이름: "myproject.internal" 입력 → 제출
```

영역 생성 후 A 레코드 추가:
```
레코드 추가 → 유형: A, 이름: vm1, TTL: 300, 주소: [VM1 사설 IP 10.0.0.x]
레코드 추가 → 유형: A, 이름: vm2, TTL: 300, 주소: [VM2 사설 IP 10.0.0.x]
→ 변경 사항 게시
```

> 이 설정은 VCN 내부에서만 동작합니다. 외부에서 접속하려면 공개 도메인이 필요합니다.

---

## 14. Nginx 리버스 프록시 & SSL (Let's Encrypt)

### 14.1 Nginx 설치

**VM1, VM2 각각 실행:**

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 14.2 도메인 연결 확인

Nginx 설정 전에 DNS가 서버 IP를 가리키는지 반드시 확인:

```bash
# VM1에서 실행
curl -s https://api.ipify.org   # 현재 서버 공인 IP 확인
dig +short openclaw.yourdomain.com  # DNS가 같은 IP를 반환해야 함
```

### 14.3 Certbot (Let's Encrypt) SSL 인증서

```bash
sudo apt install -y certbot python3-certbot-nginx

# VM1 — OpenClaw용
sudo certbot --nginx -d openclaw.yourdomain.com \
  --non-interactive --agree-tos -m your@email.com

# VM2 — brewnet용
sudo certbot --nginx -d brewnet.yourdomain.com \
  --non-interactive --agree-tos -m your@email.com
```

### 14.4 Nginx 리버스 프록시 설정 — VM1 (OpenClaw)

```bash
sudo tee /etc/nginx/sites-available/openclaw << 'EOF'
server {
    listen 80;
    server_name openclaw.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name openclaw.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/openclaw.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/openclaw.yourdomain.com/privkey.pem;

    # OpenClaw WebSocket 프록시
    location / {
        proxy_pass http://127.0.0.1:18789;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 14.5 Nginx 리버스 프록시 설정 — VM2 (brewnet)

```bash
sudo tee /etc/nginx/sites-available/brewnet << 'EOF'
server {
    listen 80;
    server_name brewnet.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name brewnet.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/brewnet.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/brewnet.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:<BREWNET_PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/brewnet /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 15. 모니터링 & 운영 팁

### 15.1 전체 서비스 상태 확인 스크립트

```bash
cat > ~/check-services.sh << 'EOF'
#!/bin/bash
echo "========== 시스템 리소스 =========="
free -h
df -h /
echo ""
echo "========== 실행 중인 서비스 =========="
# Systemd 서비스
for svc in brewnet tika nginx; do
    STATUS=$(systemctl is-active "$svc" 2>/dev/null)
    echo "[$STATUS] $svc"
done
# Docker 컨테이너
echo ""
echo "========== Docker 컨테이너 =========="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "========== 포트 리스닝 =========="
sudo ss -tlnp | grep -E ':(80|443|18789|9998)\s'
EOF

chmod +x ~/check-services.sh
```

### 15.2 OCI Oracle 무료 계정 비활성화 방지

무료 계정은 **60일 이상 로그인 및 활동 없으면 비활성화** 경고 발송.

```bash
# 간단한 주기적 활동 스크립트 (VM에서 실행)
# crontab -e 로 등록
# 매주 월요일 자정에 간단한 활동 생성
0 0 * * 1 /usr/bin/touch /home/ubuntu/.oci_keepalive
```

### 15.3 로그 로테이션

```bash
# journald 로그 크기 제한
sudo tee /etc/systemd/journald.conf.d/size.conf > /dev/null << 'EOF'
[Journal]
SystemMaxUse=500M
MaxRetentionSec=2week
EOF

sudo systemctl restart systemd-journald
```

### 15.4 자동 보안 업데이트

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 15.5 유용한 운영 명령어 모음

```bash
# OpenClaw 로그 (Systemd 방식)
journalctl --user -u openclaw-gateway -f --since "1 hour ago"

# Docker 방식 OpenClaw 로그
docker compose -f ~/openclaw-deploy/docker-compose.yml logs -f

# brewnet 로그
journalctl -u brewnet -f

# Tika Docker 로그
docker logs tika-server -f

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log

# 전체 시스템 로그
sudo journalctl -f

# 포트 사용 현황
sudo ss -tlnp

# Docker 리소스 사용량
docker stats
```

---

## 16. 요약 체크리스트

### Oracle Cloud 계정 개설
- [ ] 해외 결제 가능 신용/직불카드 준비
- [ ] 카드에 인쇄된 영문 이름으로 가입
- [ ] 홈 리전: `ap-chuncheon-1` 선택 (ARM 가용성 높음)
- [ ] VPN 비활성화 상태에서 가입
- [ ] 계정 활성화 이메일 확인

### OCI 인프라 세팅
- [ ] VCN 생성 (인터넷 게이트웨이 포함)
- [ ] 보안 목록 인바운드 규칙 추가 (22, 80, 443, 18789)
- [ ] VM1 (ARM A1, 2 OCPU, 12GB) 생성 — OpenClaw
- [ ] VM2 (ARM A1, 2 OCPU, 12GB) 생성 — brewnet + tika
- [ ] SSH 키 파일 로컬 저장 및 권한 설정 (`chmod 400`)

### 서버 공통 초기 세팅
- [ ] 시스템 업데이트 (`apt update && upgrade`)
- [ ] 타임존 설정 (Asia/Seoul)
- [ ] iptables 포트 허용 및 영구 저장
- [ ] 스왑 설정 (4GB)
- [ ] Docker 설치

### VM1 — OpenClaw
- [ ] Node.js 22 설치
- [ ] `NODE_OPTIONS="--max-old-space-size=4096"` 설정
- [ ] OpenClaw 설치 (`npm install -g openclaw@latest`)
- [ ] `~/.openclaw/openclaw.json` 설정 (모델, Telegram 토큰 등)
- [ ] Docker Compose 또는 Systemd 서비스 등록
- [ ] `loginctl enable-linger ubuntu` 설정
- [ ] 텔레그램 페어링 완료
- [ ] `openclaw doctor` 이상 없음 확인

### VM2 — brewnet
- [ ] Node.js 22 설치
- [ ] 프로젝트 클론 및 의존성 설치
- [ ] `.env` 환경 변수 설정
- [ ] Systemd 서비스 등록 및 시작

### VM2 — tika
- [ ] Docker Compose로 Apache Tika 배포 (arm64)
- [ ] `127.0.0.1:9998` 바인딩 확인 (외부 미노출)
- [ ] Systemd 서비스 등록

### 도메인 & DNS 설정
- [ ] 도메인 구매 (가비아 / Cloudflare Registrar 등)
- [ ] Cloudflare 계정 생성 및 도메인 추가 (권장)
- [ ] 도메인 등록사에서 Cloudflare 네임서버로 변경
- [ ] Cloudflare DNS A 레코드 추가 (openclaw → VM1, brewnet → VM2)
- [ ] DNS 전파 확인 (`dig +short yourdomain.com` 으로 IP 일치 확인)
- [ ] VM2 DDNS 스크립트 배포 및 crontab 등록 (동적 IP 대응)

### Nginx & SSL
- [ ] Nginx 설치
- [ ] 도메인 DNS A 레코드 설정
- [ ] Certbot Let's Encrypt 인증서 발급
- [ ] 리버스 프록시 설정 (OpenClaw WebSocket 포함)
- [ ] `nginx -t` 문법 검사 통과

---

## 참고 링크

| 항목 | URL |
|---|---|
| Oracle Cloud Free Tier | https://www.oracle.com/kr/cloud/free/ |
| OCI 콘솔 로그인 | https://cloud.oracle.com |
| OCI Free Tier FAQ | https://www.oracle.com/kr/cloud/free/faq/ |
| OpenClaw GitHub | https://github.com/openclaw/openclaw |
| OpenClaw 공식 문서 | https://docs.openclaw.ai |
| OpenClaw 시작 가이드 | https://docs.openclaw.ai/start/getting-started |
| OpenClaw Docker 가이드 | https://docs.openclaw.ai/install/docker |
| OpenClaw 보안 가이드 | https://docs.openclaw.ai/gateway/security |
| Apache Tika Docker | https://hub.docker.com/r/apache/tika |
| Node.js 설치 (nodesource) | https://github.com/nodesource/distributions |
| 가비아 도메인 구매 | https://www.gabia.com |
| Cloudflare Registrar | https://www.cloudflare.com/products/registrar/ |
| Cloudflare 대시보드 | https://dash.cloudflare.com |
| DNS 전파 확인 (dnschecker) | https://dnschecker.org |
| 영문 주소 변환 도구 | https://www.juseng.co.kr |

---

*이 가이드는 Oracle Cloud Free Tier 정책 및 OpenClaw 공식 문서 기준으로 작성되었습니다.  
Oracle의 무료 티어 정책이나 OpenClaw API는 업데이트될 수 있으니 최신 공식 문서를 함께 참고하세요.*
