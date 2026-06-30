// Hitung iuran sesi (v2) — cock dibagi PER GAME ke 4 pemainnya.
//
//   biaya_cock_game   = jumlah_cock_game x harga_cock_per_biji
//   porsi_per_pemain  = biaya_cock_game / 4
//   porsi_cock_pemain = jumlah porsi dari tiap game yang dia ikut
//   tagihan_pemain    = (non-member ? tarif_lapangan : 0) + porsi_cock_pemain
//
// attendees: [{ player_id, name, is_member, paid }]
// games:     [{ id, cock_used, played_at, playerIds: [] }]
// sesi:      { cock_price_per_piece, court_fee_nonmember }

export function hitungIuran(sesi, attendees, games) {
  const cockPrice = sesi?.cock_price_per_piece || 0
  const courtFee = sesi?.court_fee_nonmember || 0

  // Akumulasi porsi cock per pemain + jumlah game
  const cockShare = {}
  const gameCount = {}
  let totalCock = 0

  for (const g of games) {
    const n = g.playerIds.length || 4
    totalCock += g.cock_used || 0
    const perPlayer = n > 0 ? ((g.cock_used || 0) * cockPrice) / n : 0
    for (const pid of g.playerIds) {
      cockShare[pid] = (cockShare[pid] || 0) + perPlayer
      gameCount[pid] = (gameCount[pid] || 0) + 1
    }
  }

  const rows = attendees.map(a => {
    const cock = Math.round(cockShare[a.player_id] || 0)
    const court = a.is_member ? 0 : courtFee
    return {
      player_id: a.player_id,
      name: a.name,
      is_member: a.is_member,
      paid: a.paid,
      gamesPlayed: gameCount[a.player_id] || 0,
      cockShare: cock,
      courtShare: court,
      total: court + cock,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  const totalBiayaCock = totalCock * cockPrice
  const totalTagihan = rows.reduce((s, r) => s + r.total, 0)
  const totalLunas = rows.filter(r => r.paid).reduce((s, r) => s + r.total, 0)
  const totalBelum = totalTagihan - totalLunas
  const jumlahMember = rows.filter(r => r.is_member).length

  return {
    cockPrice, courtFee,
    totalCock, totalBiayaCock,
    rows,
    totalTagihan, totalLunas, totalBelum,
    jumlahMember, jumlahNon: rows.length - jumlahMember,
    jumlahGame: games.length,
  }
}

export const rupiah = n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

// "X mnt lalu" ringkas
export function waktuLalu(iso) {
  if (!iso) return 'Belum main'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'Baru aja'
  if (m < 60) return `${m} mnt lalu`
  return `${Math.floor(m / 60)} jam lalu`
}
